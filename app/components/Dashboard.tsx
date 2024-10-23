"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Papa from "papaparse";
// import { Data, BarData } from "plotly.js"; // Importação dos tipos Data e BarData
import Plotly, { Data, Layout, Config } from 'plotly.js';

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

// Definição do tipo das KPIs
type KPI = "CSAT" | "CRES" | "FCR" | "RCR" | "Hangup";

// Atualização da interface Ticket para permitir null nas KPIs
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
  contactDate: Date | null; // Atualizado para aceitar null
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

const KPI_GOALS: Record<KPI, number> = {
  CSAT: 93.5,
  CRES: 83,
  FCR: 93.5,
  RCR: 18.2,
  Hangup: 80, // Meta atualizada para 80%
};

const Dashboard: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    const loadCSV = async () => {
      try {
        Papa.parse("/tickets.csv", {
          download: true,
          header: true,
          dynamicTyping: false,
          complete: (result) => {
            let data = result.data as Ticket[];

            data = data.map((ticket, index) => ({
              ...ticket,
              id: index + 1,
              "% CSAT": parseNumber(ticket["% CSAT"]),
              "% CRES": parseNumber(ticket["% CRES"]),
              "% FCR": parseNumber(ticket["% FCR"]),
              "% RCR": parseNumber(ticket["% RCR"]),
              "% Hangup": parseNumber(ticket["% Hangup"]),
              AHT: ticket.AHT ? parseFloat(ticket.AHT as string).toFixed(2) : "",
              driver: ticket["Driver Level2"] || "Indefinido",
              nextStep: ticket["Next Steps - Reason (L2)"] || "Não Definido",
              "Agent Name": ticket["Agent Name"] || "Atendente Padrão",
              contactDate: parseDate(ticket["Day(Contact Date)"]),
            }));

            const dates = data
              .map((ticket) => ticket.contactDate)
              .filter((date) => date != null) as Date[];

            const minDate = new Date(Math.min(...dates.map((date) => date.getTime())));
            const maxDate = new Date(Math.max(...dates.map((date) => date.getTime())));

            setStartDate(minDate.toISOString().split("T")[0]);
            setEndDate(maxDate.toISOString().split("T")[0]);

            setTickets(data);
            setLoading(false);
          },
          error: (err) => {
            console.error("Erro ao carregar o CSV:", err);
            setError("Falha ao carregar os dados.");
            setLoading(false);
          },
        });
      } catch (err) {
        console.error("Erro inesperado:", err);
        setError("Ocorreu um erro inesperado.");
        setLoading(false);
      }
    };

    loadCSV();
  }, []);

  useEffect(() => {
    if (tickets.length > 0 && !selectedAgent) {
      const agents = Array.from(new Set(tickets.map((ticket) => ticket["Agent Name"])));
      setSelectedAgent(agents[0]);
    }
  }, [tickets]);

  const groupTickets = (tickets: Ticket[]) => {
    return tickets.reduce((acc, ticket) => {
      const driver = ticket.driver || "Indefinido";
      const nextStep = ticket.nextStep || "Não Definido";
      const key = `${driver}||${nextStep}`;

      if (!acc[key]) {
        acc[key] = {
          driver,
          nextStep,
          tickets: [],
        };
      }
      acc[key].tickets.push(ticket);
      return acc;
    }, {} as Record<string, { driver: string; nextStep: string; tickets: Ticket[] }>);
  };

  const calculateData = useMemo(() => {
    if (tickets.length === 0 || !selectedAgent) return { plotData: [], selectedTickets: [] };

    const agentTickets = tickets.filter((ticket) => {
      if (ticket["Agent Name"] !== selectedAgent) return false;
      if (!ticket.contactDate) return false;

      if (startDate) {
        const start = new Date(startDate);
        if (ticket.contactDate < start) return false;
      }

      if (endDate) {
        const end = new Date(endDate);
        // Ajusta a data final para incluir o dia inteiro
        end.setHours(23, 59, 59, 999);
        if (ticket.contactDate > end) return false;
      }

      return true;
    });

    const groupedTickets = groupTickets(agentTickets);

    const combinations = Object.values(groupedTickets).map((group) => {
      const totalTickets = group.tickets.length;

      const avgKPIs = ["% CSAT", "% CRES", "% FCR", "% RCR", "% Hangup"].reduce((acc, kpi) => {
        const validTickets = group.tickets.filter((ticket) => parseNumber(ticket[kpi]) !== null);
        const avg =
          validTickets.reduce((sum, ticket) => sum + (parseNumber(ticket[kpi]) || 0), 0) /
          validTickets.length;
        acc[kpi] = avg;
        return acc;
      }, {} as Record<string, number>);

      const deviations: Partial<Record<KPI, number>> = {};

      if (avgKPIs["% CSAT"] < KPI_GOALS.CSAT)
        deviations.CSAT = KPI_GOALS.CSAT - avgKPIs["% CSAT"];
      if (avgKPIs["% CRES"] < KPI_GOALS.CRES)
        deviations.CRES = KPI_GOALS.CRES - avgKPIs["% CRES"];
      if (avgKPIs["% FCR"] < KPI_GOALS.FCR)
        deviations.FCR = KPI_GOALS.FCR - avgKPIs["% FCR"];
      if (avgKPIs["% RCR"] > KPI_GOALS.RCR)
        deviations.RCR = avgKPIs["% RCR"] - KPI_GOALS.RCR;
      if (avgKPIs["% Hangup"] < KPI_GOALS.Hangup)
        deviations.Hangup = KPI_GOALS.Hangup - avgKPIs["% Hangup"];

      const totalDeviation = Object.values(deviations).reduce((sum, val) => sum + (val || 0), 0);

      const proportions: Partial<Record<KPI, number>> = {};
      if (totalDeviation > 0) {
        for (const [kpi, dev] of Object.entries(deviations) as [KPI, number][]) {
          proportions[kpi] = (dev / totalDeviation) * totalTickets;
        }
      }

      return {
        xValue: `${group.driver}\n${group.nextStep}`,
        totalTickets,
        deviations,
        proportions,
        driver: group.driver,
        nextStep: group.nextStep,
        avgKPIs,
        tickets: group.tickets,
        totalDeviation,
      };
    });

    const filteredCombinations = combinations
      .filter((comb) => comb.totalDeviation > 0)
      .sort((a, b) => b.totalTickets - a.totalTickets);

    const topCombinations = filteredCombinations.slice(0, 10);

    const kpis: KPI[] = ["CSAT", "CRES", "FCR", "RCR", "Hangup"];



    type BarData = Partial<Data> & {
      x: string[] | number[];
      y: number[];
    }
    
    const plotData: BarData[] = kpis.map((kpi) => ({
      name: kpi,
      x: topCombinations.map((comb) => comb.xValue),
      y: topCombinations.map((comb) => comb.proportions[kpi] || 0),
      type: "bar",
      // Resto do código
    }));


    const topCombination = filteredCombinations[0];
    let selectedTickets: Ticket[] = [];

    if (topCombination) {
      const maxDeviationKPI = Object.keys(topCombination.deviations).reduce((a, b) =>
        (topCombination.deviations[a as KPI] || 0) > (topCombination.deviations[b as KPI] || 0)
          ? a
          : b
      ) as KPI;

      const kpiField = `% ${maxDeviationKPI}`;
      selectedTickets = topCombination.tickets
        .filter((ticket) => {
          const value = parseNumber(ticket[kpiField]) || 0;
          if (maxDeviationKPI === "RCR") return value > KPI_GOALS[maxDeviationKPI];
          else return value < KPI_GOALS[maxDeviationKPI];
        })
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
    }

    return { plotData, selectedTickets };
  }, [tickets, selectedAgent, startDate, endDate]);

  const { plotData, selectedTickets } = calculateData;

  if (loading) {
    return <div>Carregando dados...</div>;
  }

  if (error) {
    return <div style={{ color: "red" }}>{error}</div>;
  }

  const agents = Array.from(new Set(tickets.map((ticket) => ticket["Agent Name"])));

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "1000px", // Define uma largura máxima
        margin: "0 auto", // Centraliza o contêiner
      }}
    >
      <h1 style={{ textAlign: "center" }}>Dashboard de Drivers</h1>

      {/* Seletor de Atendente */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <label htmlFor="agentSelect" style={{ marginRight: "10px", fontWeight: "bold" }}>
          Selecione o Atendente:
        </label>
        <select
          id="agentSelect"
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          style={{
            backgroundColor: "#f0f0f0",
            color: "#000000",
            border: "1px solid #ccc",
            padding: "6px",
          }}
        >
          {agents.map((agent) => (
            <option key={agent} value={agent}>
              {agent}
            </option>
          ))}
        </select>
      </div>

      {/* Seletor de Intervalo de Datas */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <label htmlFor="startDate" style={{ marginRight: "10px", fontWeight: "bold" }}>
          Data Inicial:
        </label>
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{
            backgroundColor: "#f0f0f0",
            color: "#000000",
            border: "1px solid #ccc",
            padding: "6px",
            marginRight: "10px",
          }}
        />
        <label htmlFor="endDate" style={{ marginRight: "10px", fontWeight: "bold" }}>
          Data Final:
        </label>
        <input
          type="date"
          id="endDate"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={{
            backgroundColor: "#f0f0f0",
            color: "#000000",
            border: "1px solid #ccc",
            padding: "6px",
          }}
        />
      </div>

      {selectedAgent ? (
        <>
          {plotData.length > 0 ? (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Plot
                data={plotData}
                layout={{
                  barmode: "stack",
                  title: `Top 5 Combinações (Driver + Next Step) para o Atendente: ${selectedAgent}`,
                  xaxis: {
                    title: "Driver e Next Step",
                    automargin: true,
                    tickangle: -45,
                    categoryorder: "array",
                    categoryarray: plotData.length > 0 ? plotData[0].x : [],
                  },
                  yaxis: {
                    title: "Volume Total de Tickets",
                    automargin: true,
                  },
                  height: 600,
                  hovermode: "closest",
                  paper_bgcolor: "#ffffff",
                  plot_bgcolor: "#ffffff",
                  legend: {
                    title: { text: "KPIs com Desvio" },
                  },
                }}
                style={{ width: "100%", height: "100%" }}
                config={{
                  responsive: true,
                }}
              />
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>Nenhum dado para exibir no gráfico.</div>
          )}

          <div style={{ marginTop: "40px" }}>
            <h2>Tickets Selecionados para Escuta</h2>

            {selectedTickets && selectedTickets.length > 0 ? (
              <div style={{ marginBottom: "40px" }}>
                <h3>Atendente: {selectedAgent}</h3>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginBottom: "20px",
                    fontSize: "12px",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "4px",
                          backgroundColor: "#f0f0f0",
                          textAlign: "left",
                        }}
                      >
                        ID
                      </th>
                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "4px",
                          backgroundColor: "#f0f0f0",
                          textAlign: "left",
                        }}
                      >
                        Driver
                      </th>
                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "4px",
                          backgroundColor: "#f0f0f0",
                          textAlign: "left",
                        }}
                      >
                        Next Step
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td
                          style={{
                            border: "1px solid #ccc",
                            padding: "4px",
                          }}
                        >
                          {ticket.id}
                        </td>
                        <td
                          style={{
                            border: "1px solid #ccc",
                            padding: "4px",
                          }}
                        >
                          {ticket.driver || "Indefinido"}
                        </td>
                        <td
                          style={{
                            border: "1px solid #ccc",
                            padding: "4px",
                          }}
                        >
                          {ticket.nextStep || "Não Definido"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Nenhum ticket selecionado para este atendente.</p>
            )}
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center" }}>Por favor, selecione um atendente.</div>
      )}
    </div>
  );
};

export default Dashboard;
