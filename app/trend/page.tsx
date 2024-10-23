// app/trend/TrendComponent.tsx

"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Papa from "papaparse";

// Componente Skeleton para o Gráfico
const PlotSkeleton: React.FC = () => (
  <div
    style={{
      width: "100%",
      height: "600px",
      backgroundColor: "#e0e0e0",
      borderRadius: "8px",
      animation: "pulse 1.5s infinite",
    }}
  >
    {/* Animação de pulso */}
    <style jsx>{`
      @keyframes pulse {
        0% {
          background-color: #e0e0e0;
        }
        50% {
          background-color: #f0f0f0;
        }
        100% {
          background-color: #e0e0e0;
        }
      }
    `}</style>
  </div>
);

// Importação dinâmica do Plot com o Skeleton Loader
const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => <PlotSkeleton />,
});

interface Ticket {
  id: number;
  "Agent Name": string;
  "Driver Level1": string;
  "Driver Level2": string;
  "Next Steps - Reason (L2)": string;
  "Day(Contact Date)": string;
  "% CSAT": string | number | null;
  "% CRES": string | number | null;
  "% FCR": string | number | null;
  "% RCR": string | number | null;
  "% Hangup": string | number | null;
  AHT: string | number;
  driver?: string;
  nextStep?: string;
  contactDate?: Date | null;
  [key: string]: any;
}

const parseNumber = (value: any): number | null => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    if (value.trim() === "") return null;
    let normalized = value.replace("%", "").replace(",", ".").trim();
    let parsed = parseFloat(normalized);
    if (isNaN(parsed)) return null;
    if (parsed <= 1) {
      parsed *= 100;
    }
    return parsed;
  }
  return null;
};

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  // Tenta analisar a data no formato ISO
  let date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    // Se falhar, tenta o formato dd/mm/yyyy
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Meses são baseados em zero
      const year = parseInt(parts[2], 10);
      date = new Date(year, month, day);
    } else {
      return null;
    }
  }
  return date;
};

const KPI_GOALS = {
  CSAT: 93.5,
  CRES: 83,
  FCR: 93.5,
  RCR: 18.2,
  Hangup: 80, // Meta atualizada para 80%
};

const TrendComponent: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [indicator, setIndicator] = useState<string>("% CSAT");
  const [employee, setEmployee] = useState<string>("Todos");
  const [startDate, setStartDate] = useState<string>("2024-10-01");
  const [endDate, setEndDate] = useState<string>("2024-10-31");
  const [driverLevel2, setDriverLevel2] = useState<string>("Todos");
  const [nextStep, setNextStep] = useState<string>("Todos");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Função para resetar os filtros
  const handleResetFilters = () => {
    setIndicator("% CSAT");
    setEmployee("Todos");
    setStartDate("2024-10-01");
    setEndDate("2024-10-31");
    setDriverLevel2("Todos");
    setNextStep("Todos");
  };

  // Carregar o CSV ao montar o componente
  useEffect(() => {
    Papa.parse<Ticket>("/tickets.csv", {
      header: true,
      download: true,
      dynamicTyping: false,
      complete: (result) => {
        // Processar e parsear os dados
        const data = result.data as Record<string, string>[];

        const processedTickets: Ticket[] = data
          .filter((ticket) => ticket["Agent Name"])
          .map((ticket, index) => ({
            id: index + 1,
            "Current Supervisor": ticket["Current Supervisor"] || "Supervisor Padrão",
            "Agent Name": ticket["Agent Name"] || "Atendente Padrão",
            "Day(Contact Date)": ticket["Day(Contact Date)"] || "",
            "% CSAT": parseNumber(ticket["% CSAT"]),
            "% CRES": parseNumber(ticket["% CRES"]),
            "% FCR": parseNumber(ticket["% FCR"]),
            "% RCR": parseNumber(ticket["% RCR"]),
            "% Hangup": parseNumber(ticket["% Hangup"]),
            AHT: ticket.AHT ? parseFloat(ticket.AHT).toFixed(2) : "",
            "Driver Level1": ticket["Driver Level1"] || "Indefinido",
            "Driver Level2": ticket["Driver Level2"] || "Indefinido",
            "Next Steps - Reason (L2)": ticket["Next Steps - Reason (L2)"] || "Não Definido",
            driver: ticket["Driver Level2"] || "Indefinido",
            nextStep: ticket["Next Steps - Reason (L2)"] || "Não Definido",
            contactDate: parseDate(ticket["Day(Contact Date)"]),
          }));

        setTickets(processedTickets);
        setFilteredTickets(processedTickets);
        setLoading(false);
      },
      error: (error) => {
        console.error("Erro ao carregar o CSV:", error);
        setError("Erro ao carregar os dados.");
        setLoading(false);
      },
    });
  }, []);

  // Filtrar os dados sempre que algum filtro mudar
  useEffect(() => {
    if (tickets.length === 0) return;

    let temp = [...tickets];

    // Filtrar por funcionário
    if (employee !== "Todos") {
      temp = temp.filter((ticket) => ticket["Agent Name"] === employee);
    }

    // Filtrar por data
    temp = temp.filter((ticket) => {
      const date = new Date(ticket["Day(Contact Date)"]);
      return date >= new Date(startDate) && date <= new Date(endDate);
    });

    // Filtrar por Driver Level2
    if (driverLevel2 !== "Todos") {
      temp = temp.filter((ticket) => ticket["Driver Level2"] === driverLevel2);
    }

    // Filtrar por Next Step
    if (nextStep !== "Todos") {
      temp = temp.filter(
        (ticket) => ticket["Next Steps - Reason (L2)"] === nextStep
      );
    }

    setFilteredTickets(temp);
  }, [tickets, employee, startDate, endDate, driverLevel2, nextStep]);

  // Extrair opções únicas para os filtros
  const uniqueEmployees = Array.from(
    new Set(tickets.map((ticket) => ticket["Agent Name"]))
  ).sort();

  const uniqueDriverLevel2 = Array.from(
    new Set(tickets.map((ticket) => ticket["Driver Level2"]))
  ).sort();

  const uniqueNextSteps = Array.from(
    new Set(tickets.map((ticket) => ticket["Next Steps - Reason (L2)"]))
  ).sort();

  // Indicadores disponíveis
  const indicators = ["% CSAT", "% CRES", "% FCR", "% RCR", "% Hangup"];

  // Preparar dados para o gráfico
  const prepareChartData = () => {
    // Agrupar por data e calcular a média do indicador selecionado
    const dataByDate: Record<string, number[]> = {};

    filteredTickets.forEach((ticket) => {
      const date = new Date(ticket["Day(Contact Date)"]).toLocaleDateString();
      const value = ticket[indicator];

      if (value !== null) {
        if (!dataByDate[date]) {
          dataByDate[date] = [];
        }
        dataByDate[date].push(value as number);
      }
    });

    // Calcular a média por data
    const dates = Object.keys(dataByDate).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    const averages = dates.map((date) => {
      const values = dataByDate[date];
      const sum = values.reduce((acc, val) => acc + val, 0);
      return sum / values.length;
    });

    // Obter a meta para o indicador selecionado
    const indicatorKey = indicator.replace("% ", "") as keyof typeof KPI_GOALS;
    const goal = KPI_GOALS[indicatorKey];

    return {
      x: dates,
      y: averages,
      goal,
    };
  };

  const chartData = prepareChartData();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #f9fafb, #e5e7eb)",
        padding: "20px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Cabeçalho */}
        <header style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#1F2937" }}>
            Dashboard de Tendência de Indicadores
          </h1>
          <p style={{ fontSize: "1.25rem", color: "#4B5563", marginTop: "10px" }}>
            Acompanhe os principais indicadores de desempenho ao longo do tempo
          </p>
        </header>

        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "400px",
            }}
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                border: "6px solid #f3f3f3",
                borderTop: "6px solid #2563EB",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            >
              <style jsx>{`
                @keyframes spin {
                  0% {
                    transform: rotate(0deg);
                  }
                  100% {
                    transform: rotate(360deg);
                  }
                }
              `}</style>
            </div>
          </div>
        ) : error ? (
          <div style={{ color: "red", textAlign: "center", fontSize: "1.5rem" }}>
            {error}
          </div>
        ) : (
          <>
            {/* Filtros */}
            <div
              style={{
                backgroundColor: "#ffffff",
                padding: "20px",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                marginBottom: "30px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "20px",
                }}
              >
                {/* Indicador */}
                <div>
                  <label
                    htmlFor="indicatorSelect"
                    style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}
                  >
                    Indicador
                  </label>
                  <select
                    id="indicatorSelect"
                    value={indicator}
                    onChange={(e) => setIndicator(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      backgroundColor: "#f9fafb",
                      color: "#1F2937",
                    }}
                  >
                    {indicators.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Funcionário */}
                <div>
                  <label
                    htmlFor="employeeSelect"
                    style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}
                  >
                    Funcionário
                  </label>
                  <select
                    id="employeeSelect"
                    value={employee}
                    onChange={(e) => setEmployee(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      backgroundColor: "#f9fafb",
                      color: "#1F2937",
                    }}
                  >
                    <option value="Todos">Todos</option>
                    {uniqueEmployees.map((emp) => (
                      <option key={emp} value={emp}>
                        {emp}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data Início */}
                <div>
                  <label
                    htmlFor="startDate"
                    style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}
                  >
                    Data Início
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      backgroundColor: "#f9fafb",
                      color: "#1F2937",
                    }}
                    max={endDate}
                  />
                </div>

                {/* Data Fim */}
                <div>
                  <label
                    htmlFor="endDate"
                    style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}
                  >
                    Data Fim
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      backgroundColor: "#f9fafb",
                      color: "#1F2937",
                    }}
                    min={startDate}
                  />
                </div>

                {/* Driver Level2 */}
                <div>
                  <label
                    htmlFor="driverLevel2Select"
                    style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}
                  >
                    Driver Level2
                  </label>
                  <select
                    id="driverLevel2Select"
                    value={driverLevel2}
                    onChange={(e) => setDriverLevel2(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      backgroundColor: "#f9fafb",
                      color: "#1F2937",
                    }}
                  >
                    <option value="Todos">Todos</option>
                    {uniqueDriverLevel2.map((dl2) => (
                      <option key={dl2} value={dl2}>
                        {dl2}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Próximo Passo */}
                <div>
                  <label
                    htmlFor="nextStepSelect"
                    style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}
                  >
                    Próximo Passo
                  </label>
                  <select
                    id="nextStepSelect"
                    value={nextStep}
                    onChange={(e) => setNextStep(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      backgroundColor: "#f9fafb",
                      color: "#1F2937",
                    }}
                  >
                    <option value="Todos">Todos</option>
                    {uniqueNextSteps.map((ns) => (
                      <option key={ns} value={ns}>
                        {ns}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ textAlign: "right", marginTop: "20px" }}>
                <button
                  onClick={handleResetFilters}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#DC2626",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Resetar Filtros
                </button>
              </div>
            </div>

            {/* Gráfico */}
            <div
              style={{
                backgroundColor: "#ffffff",
                padding: "20px",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <h2
                style={{
                  fontSize: "1.75rem",
                  fontWeight: "bold",
                  color: "#1F2937",
                  marginBottom: "20px",
                  textAlign: "center",
                }}
              >
                Gráfico de Tendência
              </h2>
              {chartData.x.length === 0 ? (
                <p style={{ textAlign: "center", color: "#6B7280", fontSize: "1.25rem" }}>
                  📊 Nenhum dado para exibir com os filtros selecionados.
                </p>
              ) : (
                <div style={{ width: "100%", height: "600px" }}>
                  <Plot
                    data={[
                      {
                        x: chartData.x,
                        y: chartData.y,
                        type: "scatter",
                        mode: "lines+markers",
                        marker: { color: "#2563EB", symbol: "circle", size: 8 },
                        line: { width: 3 },
                        name: indicator,
                      },
                      {
                        x: chartData.x,
                        y: new Array(chartData.x.length).fill(chartData.goal),
                        type: "scatter",
                        mode: "lines",
                        line: { dash: "dash", color: "#DC2626", width: 2 },
                        name: "Meta",
                      },
                    ]}
                    layout={{
                      title: {
                        text: `Tendência de ${indicator} ao longo do tempo`,
                        font: {
                          size: 24,
                          color: "#1F2937",
                        },
                        x: 0.5,
                      },
                      xaxis: {
                        title: {
                          text: "Data",
                          font: {
                            size: 16,
                            color: "#4B5563",
                          },
                        },
                        gridcolor: "#E5E7EB",
                        zerolinecolor: "#E5E7EB",
                      },
                      yaxis: {
                        title: {
                          text: indicator,
                          font: {
                            size: 16,
                            color: "#4B5563",
                          },
                        },
                        gridcolor: "#E5E7EB",
                        zerolinecolor: "#E5E7EB",
                      },
                      plot_bgcolor: "#FFFFFF",
                      paper_bgcolor: "#FFFFFF",
                      autosize: true,
                      legend: {
                        x: 0,
                        y: 1.1,
                        orientation: "h",
                        font: {
                          size: 14,
                          color: "#4B5563",
                        },
                      },
                      margin: { t: 70, b: 70, l: 60, r: 30 },
                    }}
                    style={{ width: "100%", height: "100%" }} // Faz o gráfico ocupar toda a largura do contêiner
                    config={{
                      responsive: true,
                    }}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TrendComponent;
