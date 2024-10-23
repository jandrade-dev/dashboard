"use client";

import React, { useEffect, useState } from "react";
import Papa from "papaparse";

interface Ticket {
  id: number;
  "Agent Name": string;
  driver: string;
  nextStep: string;
  "% CSAT": number | null;
  "% CRES": number | null;
  "% FCR": number | null;
  "% RCR": number | null;
  "% Hangup": number | null;
  AHT: number | null;
}

interface TableDataRow {
  driver: string;
  nextStep: string;
  volume: number;
  CSAT: string;
  CSAT_Deviation: number | null;
  CSAT_Deviation_Str: string;
  CRES: string;
  CRES_Deviation: number | null;
  CRES_Deviation_Str: string;
  FCR: string;
  FCR_Deviation: number | null;
  FCR_Deviation_Str: string;
  RCR: string;
  RCR_Deviation: number | null;
  RCR_Deviation_Str: string;
  Hangup: string;
  Hangup_Deviation: number | null;
  Hangup_Deviation_Str: string;
}

const parseNumber = (value: any): number | null => {
  if (typeof value === "number") {
    if (isNaN(value)) return null;
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.replace("%", "").replace(",", ".").trim();
    if (normalized === "") return null;
    let parsed = parseFloat(normalized);
    if (isNaN(parsed)) return null;
    if (parsed <= 1 && parsed >= 0) parsed *= 100;
    return parsed;
  }
  return null;
};

const KPI_GOALS = {
  CSAT: 93.5,
  CRES: 83,
  FCR: 93.5,
  RCR: 18.2,
  Hangup: 80,
};

const getDeviationColor = (deviation: number | null): string | undefined => {
  if (deviation === null || isNaN(deviation)) return undefined;
  if (deviation === 0) return "#ffffff"; // Cor branca para desvio zero
  const intensity = Math.min(deviation / 50, 1);
  const lightness = 100 - intensity * 50;
  return `hsl(0, 100%, ${lightness}%)`;
};

const Table: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof TableDataRow;
    direction: "asc" | "desc";
  } | null>(null);
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>("All");
  const [selectedNextStepFilter, setSelectedNextStepFilter] = useState<string>("All");

  // Novas variáveis de estado para paginação
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    Papa.parse("/tickets.csv", {
      download: true,
      header: true,
      dynamicTyping: false,
      complete: (result) => {
        const data = result.data as any[];

        const processedTickets = data.map((ticket, index) => ({
          id: index + 1,
          "Agent Name": ticket["Agent Name"] || "Atendente Padrão",
          driver: ticket["Driver Level2"] || "Indefinido",
          nextStep: ticket["Next Steps - Reason (L2)"] || "Não Definido",
          "% CSAT": parseNumber(ticket["% CSAT"]),
          "% CRES": parseNumber(ticket["% CRES"]),
          "% FCR": parseNumber(ticket["% FCR"]),
          "% RCR": parseNumber(ticket["% RCR"]),
          "% Hangup": parseNumber(ticket["% Hangup"]),
          AHT: ticket.AHT ? parseFloat(ticket.AHT) : null,
        }));

        setTickets(processedTickets);
        setLoading(false);
      },
      error: (err) => {
        console.error("Erro ao carregar o CSV:", err);
        setError("Falha ao carregar os dados.");
        setLoading(false);
      },
    });
  }, []);

  useEffect(() => {
    if (tickets.length > 0 && !selectedAgent) {
      const agents = Array.from(new Set(tickets.map((t) => t["Agent Name"])));
      setSelectedAgent(agents[0]);
    }
  }, [tickets]);

  const handleSort = (key: keyof TableDataRow) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const tableData: TableDataRow[] = React.useMemo(() => {
    if (tickets.length === 0 || !selectedAgent) return [];

    let agentTickets = tickets.filter(
      (t) => t["Agent Name"] === selectedAgent
    );

    if (selectedDriverFilter !== "All") {
      agentTickets = agentTickets.filter(
        (t) => t.driver === selectedDriverFilter
      );
    }

    if (selectedNextStepFilter !== "All") {
      agentTickets = agentTickets.filter(
        (t) => t.nextStep === selectedNextStepFilter
      );
    }

    const grouped = agentTickets.reduce((acc, ticket) => {
      const key = `${ticket.driver}||${ticket.nextStep}`;
      if (!acc[key]) {
        acc[key] = {
          driver: ticket.driver,
          nextStep: ticket.nextStep,
          volume: 0,
          CSAT: [],
          CRES: [],
          FCR: [],
          RCR: [],
          Hangup: [],
        };
      }
      acc[key].volume += 1;
      if (ticket["% CSAT"] !== null && !isNaN(ticket["% CSAT"]))
        acc[key].CSAT.push(ticket["% CSAT"]);
      if (ticket["% CRES"] !== null && !isNaN(ticket["% CRES"]))
        acc[key].CRES.push(ticket["% CRES"]);
      if (ticket["% FCR"] !== null && !isNaN(ticket["% FCR"]))
        acc[key].FCR.push(ticket["% FCR"]);
      if (ticket["% RCR"] !== null && !isNaN(ticket["% RCR"]))
        acc[key].RCR.push(ticket["% RCR"]);
      if (ticket["% Hangup"] !== null && !isNaN(ticket["% Hangup"]))
        acc[key].Hangup.push(ticket["% Hangup"]);
      return acc;
    }, {} as Record<string, any>);

    const avg = (arr: number[]) => {
      const validValues = arr.filter((val) => val !== null && !isNaN(val));
      if (validValues.length === 0) return null;
      const sum = validValues.reduce((sum, val) => sum + val, 0);
      return sum / validValues.length;
    };

    const result = Object.values(grouped).map((group) => {
      const avgCSAT = avg(group.CSAT);
      const avgCRES = avg(group.CRES);
      const avgFCR = avg(group.FCR);
      const avgRCR = avg(group.RCR);
      const avgHangup = avg(group.Hangup);

      const deviations = {
        CSAT: avgCSAT !== null ? Math.max(KPI_GOALS.CSAT - avgCSAT, 0) : null,
        CRES: avgCRES !== null ? Math.max(KPI_GOALS.CRES - avgCRES, 0) : null,
        FCR: avgFCR !== null ? Math.max(KPI_GOALS.FCR - avgFCR, 0) : null,
        RCR: avgRCR !== null ? Math.max(avgRCR - KPI_GOALS.RCR, 0) : null, // RCR é inverso
        Hangup:
          avgHangup !== null
            ? Math.max(KPI_GOALS.Hangup - avgHangup, 0)
            : null,
      };

      return {
        driver: group.driver,
        nextStep: group.nextStep,
        volume: group.volume,
        CSAT: avgCSAT !== null ? avgCSAT.toFixed(2) + "%" : "",
        CSAT_Deviation: deviations.CSAT,
        CSAT_Deviation_Str:
          deviations.CSAT !== null ? deviations.CSAT.toFixed(2) + "%" : "",
        CRES: avgCRES !== null ? avgCRES.toFixed(2) + "%" : "",
        CRES_Deviation: deviations.CRES,
        CRES_Deviation_Str:
          deviations.CRES !== null ? deviations.CRES.toFixed(2) + "%" : "",
        FCR: avgFCR !== null ? avgFCR.toFixed(2) + "%" : "",
        FCR_Deviation: deviations.FCR,
        FCR_Deviation_Str:
          deviations.FCR !== null ? deviations.FCR.toFixed(2) + "%" : "",
        RCR: avgRCR !== null ? avgRCR.toFixed(2) + "%" : "",
        RCR_Deviation: deviations.RCR,
        RCR_Deviation_Str:
          deviations.RCR !== null ? deviations.RCR.toFixed(2) + "%" : "",
        Hangup: avgHangup !== null ? avgHangup.toFixed(2) + "%" : "",
        Hangup_Deviation: deviations.Hangup,
        Hangup_Deviation_Str:
          deviations.Hangup !== null ? deviations.Hangup.toFixed(2) + "%" : "",
      };
    });

    return result;
  }, [
    tickets,
    selectedAgent,
    selectedDriverFilter,
    selectedNextStepFilter,
  ]);

  const sortedTableData = React.useMemo(() => {
    if (sortConfig !== null) {
      return [...tableData].sort((a: TableDataRow, b: TableDataRow) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        // Adicionando verificações para valores nulos ou indefinidos
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        const aNum = parseFloat(aValue as string);
        const bNum = parseFloat(bValue as string);

        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
        }

        // Comparação para strings
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return tableData;
  }, [tableData, sortConfig]);

  // Cálculo de dados para paginação
  const totalPages = Math.ceil(sortedTableData.length / rowsPerPage);

  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedTableData.slice(startIndex, endIndex);
  }, [sortedTableData, currentPage, rowsPerPage]);

  // Resetar a página atual se os filtros ou ordenação mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [sortedTableData, rowsPerPage]);

  if (loading) return <div>Carregando dados...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  const agents = Array.from(new Set(tickets.map((t) => t["Agent Name"])));
  const drivers = Array.from(new Set(tickets.map((t) => t.driver)));
  const nextSteps = Array.from(new Set(tickets.map((t) => t.nextStep)));

  const tableHeaderStyle: React.CSSProperties = {
    border: "1px solid #ddd",
    padding: "8px",
    backgroundColor: "#f0f0f0",
    cursor: "pointer",
    textAlign: "left",
  };

  const tableCellStyle: React.CSSProperties = {
    border: "1px solid #ccc",
    padding: "8px",
    textAlign: "left",
  };

  const paginationStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "20px",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "8px 12px",
    margin: "0 5px",
    border: "1px solid #ccc",
    backgroundColor: "#f0f0f0",
    cursor: "pointer",
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    cursor: "not-allowed",
    opacity: 0.5,
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ textAlign: "center" }}>Dashboard de Drivers</h1>

      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <label
          htmlFor="agentSelect"
          style={{ marginRight: "10px", fontWeight: "bold" }}
        >
          Selecione o Atendente:
        </label>
        <select
          id="agentSelect"
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          style={{
            backgroundColor: "#f0f0f0",
            color: "#000",
            border: "1px solid #ccc",
            padding: "6px",
            marginRight: "20px",
          }}
        >
          {agents.map((agent) => (
            <option key={agent} value={agent}>
              {agent}
            </option>
          ))}
        </select>

        <label
          htmlFor="driverFilter"
          style={{ marginRight: "10px", fontWeight: "bold" }}
        >
          Filtrar por Driver:
        </label>
        <select
          id="driverFilter"
          value={selectedDriverFilter}
          onChange={(e) => setSelectedDriverFilter(e.target.value)}
          style={{
            backgroundColor: "#f0f0f0",
            color: "#000",
            border: "1px solid #ccc",
            padding: "6px",
            marginRight: "20px",
          }}
        >
          <option value="All">Todos</option>
          {drivers.map((driver) => (
            <option key={driver} value={driver}>
              {driver}
            </option>
          ))}
        </select>

        <label
          htmlFor="nextStepFilter"
          style={{ marginRight: "10px", fontWeight: "bold" }}
        >
          Filtrar por Next Step:
        </label>
        <select
          id="nextStepFilter"
          value={selectedNextStepFilter}
          onChange={(e) => setSelectedNextStepFilter(e.target.value)}
          style={{
            backgroundColor: "#f0f0f0",
            color: "#000",
            border: "1px solid #ccc",
            padding: "6px",
          }}
        >
          <option value="All">Todos</option>
          {nextSteps.map((step) => (
            <option key={step} value={step}>
              {step}
            </option>
          ))}
        </select>
      </div>

      {/* Seção para selecionar o número de linhas por página */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <label
          htmlFor="rowsPerPageSelect"
          style={{ marginRight: "10px", fontWeight: "bold" }}
        >
          Linhas por página:
        </label>
        <select
          id="rowsPerPageSelect"
          value={rowsPerPage}
          onChange={(e) => setRowsPerPage(Number(e.target.value))}
          style={{
            backgroundColor: "#f0f0f0",
            color: "#000",
            border: "1px solid #ccc",
            padding: "6px",
          }}
        >
          {[5, 10, 20, 50, 100].map((num) => (
            <option key={num} value={num}>
              {num}
            </option>
          ))}
        </select>
      </div>

      {selectedAgent ? (
        sortedTableData.length > 0 ? (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {[
                      { key: "driver", label: "Driver" },
                      { key: "nextStep", label: "Next Step" },
                      { key: "volume", label: "Volume" },
                      { key: "CSAT", label: "% CSAT" },
                      { key: "CSAT_Deviation", label: "Desvio CSAT" },
                      { key: "CRES", label: "% CRES" },
                      { key: "CRES_Deviation", label: "Desvio CRES" },
                      { key: "FCR", label: "% FCR" },
                      { key: "FCR_Deviation", label: "Desvio FCR" },
                      { key: "RCR", label: "% RCR" },
                      { key: "RCR_Deviation", label: "Desvio RCR" },
                      { key: "Hangup", label: "% Hangup" },
                      { key: "Hangup_Deviation", label: "Desvio Hangup" },
                    ].map((column) => (
                      <th
                        key={column.key}
                        style={tableHeaderStyle}
                        onClick={() => handleSort(column.key as keyof TableDataRow)}
                      >
                        {column.label}{" "}
                        {sortConfig?.key === column.key
                          ? sortConfig.direction === "asc"
                            ? "▲"
                            : "▼"
                          : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, index) => {
                    const csatColor = getDeviationColor(row.CSAT_Deviation);
                    const cresColor = getDeviationColor(row.CRES_Deviation);
                    const fcrColor = getDeviationColor(row.FCR_Deviation);
                    const rcrColor = getDeviationColor(row.RCR_Deviation);
                    const hangupColor = getDeviationColor(row.Hangup_Deviation);

                    return (
                      <tr
                        key={index}
                        style={{
                          backgroundColor:
                            (currentPage - 1) * rowsPerPage + index % 2 === 0
                              ? "#f9f9f9"
                              : "#fff",
                        }}
                      >
                        <td style={tableCellStyle}>{row.driver}</td>
                        <td style={tableCellStyle}>{row.nextStep}</td>
                        <td style={tableCellStyle}>{row.volume}</td>
                        <td style={tableCellStyle}>{row.CSAT}</td>
                        <td
                          style={{
                            ...tableCellStyle,
                            backgroundColor: csatColor,
                          }}
                        >
                          {row.CSAT_Deviation_Str}
                        </td>
                        <td style={tableCellStyle}>{row.CRES}</td>
                        <td
                          style={{
                            ...tableCellStyle,
                            backgroundColor: cresColor,
                          }}
                        >
                          {row.CRES_Deviation_Str}
                        </td>
                        <td style={tableCellStyle}>{row.FCR}</td>
                        <td
                          style={{
                            ...tableCellStyle,
                            backgroundColor: fcrColor,
                          }}
                        >
                          {row.FCR_Deviation_Str}
                        </td>
                        <td style={tableCellStyle}>{row.RCR}</td>
                        <td
                          style={{
                            ...tableCellStyle,
                            backgroundColor: rcrColor,
                          }}
                        >
                          {row.RCR_Deviation_Str}
                        </td>
                        <td style={tableCellStyle}>{row.Hangup}</td>
                        <td
                          style={{
                            ...tableCellStyle,
                            backgroundColor: hangupColor,
                          }}
                        >
                          {row.Hangup_Deviation_Str}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Controles de paginação */}
            <div style={paginationStyle}>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={currentPage === 1 ? disabledButtonStyle : buttonStyle}
              >
                Anterior
              </button>
              <span style={{ margin: "0 10px" }}>
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                style={currentPage === totalPages ? disabledButtonStyle : buttonStyle}
              >
                Próxima
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            Nenhum dado para exibir na tabela.
          </div>
        )
      ) : (
        <div style={{ textAlign: "center" }}>
          Por favor, selecione um atendente.
        </div>
      )}
    </div>
  );
};

export default Table;
