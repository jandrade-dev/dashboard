# Dashboard de Indicadores de Atendimento

Este projeto é uma aplicação Next.js que processa um arquivo CSV contendo dados de tickets de atendimento e apresenta análises interativas dos KPIs. O sistema oferece três funcionalidades principais:

- **Visualização dos Dados:**  
  Processa e converte os dados do CSV (valores numéricos e datas), agrupa os tickets por combinações de *Driver* e *Next Step* e calcula médias e desvios dos KPIs em relação às metas pré-definidas.

- **Exibição Interativa:**  
  Exibe um gráfico de barras (usando Plotly) com as principais combinações para cada atendente, além de uma tabela interativa que permite filtrar, ordenar e paginar os dados para uma análise detalhada dos resultados.

- **Análise de Tendência:**  
  Permite filtrar os dados por funcionário, intervalo de datas, *Driver Level2* e *Next Step*, e apresenta um gráfico de tendência que mostra a evolução do KPI selecionado ao longo do tempo, comparando com a meta definida.

## Tecnologias Utilizadas

- **Next.js** – Framework React para renderização do lado do servidor e geração de páginas estáticas.
- **TypeScript** – Tipagem estática para maior segurança e qualidade do código.
- **Tailwind CSS** – Estilização rápida e responsiva (caso integrado no projeto).
- **Plotly.js / react-plotly.js** – Visualização interativa dos gráficos.
- **Papaparse** – Processamento e parsing do arquivo CSV.

## Pré-requisitos

- [Node.js](https://nodejs.org/) instalado (versão LTS recomendada).
- Gerenciador de pacotes (npm ou yarn).

## Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/seu-repositorio.git
   ```
2. Acesse a pasta do projeto:
   ```bash
   cd seu-repositorio
   ```
3. Instale as dependências:
   ```bash
   npm install
   ```
   ou, se preferir:
   ```bash
   yarn install
   ```

## Execução

Para iniciar o projeto em ambiente de desenvolvimento (no Windows), utilize:

```bash
npm run dev
```
ou
```bash
yarn dev
```

A aplicação estará disponível em [http://localhost:3000](http://localhost:3000).

## Estrutura do Projeto

- **Dashboard:**  
  Componente que carrega os dados do CSV, processa e agrupa os tickets, calcula médias dos KPIs e exibe um gráfico de barras interativo com as principais combinações (Driver + Next Step) para o atendente selecionado. Também seleciona alguns tickets para análise adicional.

- **Table:**  
  Componente que exibe os dados em formato de tabela, permitindo filtros por atendente, Driver e Next Step, além de ordenação e paginação para facilitar a análise detalhada.

- **TrendComponent:**  
  Componente focado na análise de tendência. Permite selecionar filtros (funcionário, intervalo de datas, Driver Level2 e Next Step) e exibe um gráfico de tendência que compara a evolução de um KPI com a meta definida.

## Configuração dos Dados

- O arquivo CSV deve estar localizado na pasta `public` do projeto e ser nomeado como `tickets.csv`.
- Certifique-se de que os nomes das colunas do CSV correspondam aos esperados (por exemplo: "Agent Name", "Driver Level2", "Next Steps - Reason (L2)", "Day(Contact Date)", "% CSAT", etc.).

## Personalizações e Melhorias

- **Estilização:**  
  Integre ou ajuste o Tailwind CSS conforme necessário para adequar a interface às necessidades do projeto.

- **Performance:**  
  A aplicação utiliza importação dinâmica e componentes de loading (Skeleton Loader) para melhorar a experiência do usuário durante o carregamento dos gráficos.

- **Funcionalidades Adicionais:**  
  Pode ser expandida com novas análises, relatórios e filtros conforme os requisitos do seu projeto.

## Licença

Este projeto está licenciado sob a MIT License.

Sinta-se à vontade para abrir issues ou enviar pull requests para melhorias.
