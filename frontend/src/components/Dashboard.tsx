import React, { useState } from 'react';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  // Dados mockados para simular o pátio
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  const metrics = {
    veiculosNoPatio: 23,
    veiculosNaFila: 7,
    veiculosNaDoca: 5,
    vagasDisponiveis: 12,
    totalVagas: 40,
    tempoMedioEspera: '45min',
    movimentacoesHoje: 42
  };

  const veiculosPatio = [
    { 
      id: 1, 
      placa: "ABC-1234", 
      status: "Pátio", 
      dataChegada: "16/02/2026 08:30", 
      dataSaida: "-",
      liberadoPor: "João Silva",
      tipoProcesso: "Carga",
      pesoEntrada: "12.500 kg",
      pesoSaida: "-",
      doca: "-"
    },
    { 
      id: 2, 
      placa: "XYZ-5678", 
      status: "Doca 3", 
      dataChegada: "16/02/2026 09:15", 
      dataSaida: "-",
      liberadoPor: "Maria Santos",
      tipoProcesso: "Descarga",
      pesoEntrada: "22.300 kg",
      pesoSaida: "8.400 kg",
      doca: "3"
    },
    { 
      id: 3, 
      placa: "JKL-9012", 
      status: "Fila", 
      dataChegada: "16/02/2026 09:45", 
      dataSaida: "-",
      liberadoPor: "Carlos Oliveira",
      tipoProcesso: "Carga",
      pesoEntrada: "-",
      pesoSaida: "-",
      doca: "-"
    },
    { 
      id: 4, 
      placa: "MNO-3456", 
      status: "Doca 1", 
      dataChegada: "16/02/2026 07:20", 
      dataSaida: "-",
      liberadoPor: "Ana Rodrigues",
      tipoProcesso: "Descarga",
      pesoEntrada: "18.750 kg",
      pesoSaida: "18.750 kg",
      doca: "1"
    },
    { 
      id: 5, 
      placa: "PQR-7890", 
      status: "Pátio", 
      dataChegada: "15/02/2026 22:10", 
      dataSaida: "-",
      liberadoPor: "Pedro Costa",
      tipoProcesso: "Aguardando",
      pesoEntrada: "9.800 kg",
      pesoSaida: "-",
      doca: "-"
    },
    { 
      id: 6, 
      placa: "STU-1234", 
      status: "Finalizado", 
      dataChegada: "15/02/2026 14:30", 
      dataSaida: "16/02/2026 10:15",
      liberadoPor: "Lucia Mendes",
      tipoProcesso: "Carga/Descarga",
      pesoEntrada: "15.200 kg",
      pesoSaida: "15.200 kg",
      doca: "2"
    },
  ];

  const veiculosFiltrados = filtroStatus === 'todos' 
    ? veiculosPatio 
    : veiculosPatio.filter(v => v.status.toLowerCase().includes(filtroStatus.toLowerCase()));

  const ocupacaoPatio = (metrics.veiculosNoPatio + metrics.veiculosNaDoca) / metrics.totalVagas * 100;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>📊 Painel de Controle - Pátio</h2>
        <div className="date-time">
          <span>📅 16 de Fevereiro de 2026</span>
          <span>🕒 10:45</span>
        </div>
      </div>
      
      {/* KPIs - Indicadores principais */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon">🚛</div>
          <div className="kpi-content">
            <h3>Veículos no Pátio</h3>
            <p className="kpi-value">{metrics.veiculosNoPatio}</p>
            <span>Aguardando doca</span>
          </div>
        </div>
        
        <div className="kpi-card">
          <div className="kpi-icon">⏳</div>
          <div className="kpi-content">
            <h3>Na Fila de Espera</h3>
            <p className="kpi-value">{metrics.veiculosNaFila}</p>
            <span>Para atendimento</span>
          </div>
        </div>
        
        <div className="kpi-card">
          <div className="kpi-icon">🏭</div>
          <div className="kpi-content">
            <h3>Nas Docas</h3>
            <p className="kpi-value">{metrics.veiculosNaDoca}</p>
            <span>Em operação</span>
          </div>
        </div>
        
        <div className="kpi-card">
          <div className="kpi-icon">🅿️</div>
          <div className="kpi-content">
            <h3>Vagas Disponíveis</h3>
            <p className="kpi-value">{metrics.vagasDisponiveis}</p>
            <span>De {metrics.totalVagas} totais</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">⏱️</div>
          <div className="kpi-content">
            <h3>Tempo Médio</h3>
            <p className="kpi-value">{metrics.tempoMedioEspera}</p>
            <span>Na fila/atendimento</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">📦</div>
          <div className="kpi-content">
            <h3>Movimentações</h3>
            <p className="kpi-value">{metrics.movimentacoesHoje}</p>
            <span>Nas últimas 24h</span>
          </div>
        </div>
      </div>

      {/* Ocupação do Pátio */}
      <div className="occupation-section">
        <h3>📍 Ocupação do Pátio</h3>
        <div className="occupation-bar">
          <div 
            className="occupation-fill" 
            style={{ width: `${ocupacaoPatio}%` }}
          >
            {ocupacaoPatio.toFixed(1)}% ocupado
          </div>
        </div>
        <div className="occupation-legend">
          <span><span className="dot" style={{backgroundColor: '#4CAF50'}}></span> Pátio: {metrics.veiculosNoPatio}</span>
          <span><span className="dot" style={{backgroundColor: '#2196F3'}}></span> Docas: {metrics.veiculosNaDoca}</span>
          <span><span className="dot" style={{backgroundColor: '#FFC107'}}></span> Fila: {metrics.veiculosNaFila}</span>
          <span><span className="dot" style={{backgroundColor: '#9E9E9E'}}></span> Vagas: {metrics.vagasDisponiveis}</span>
        </div>
      </div>

      {/* Filtros e Painel de Veículos */}
      <div className="veiculos-section">
        <div className="section-header">
          <h3>🚚 Veículos no Pátio / Docas</h3>
          <div className="filters">
            <select 
              value={filtroStatus} 
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="status-filter"
            >
              <option value="todos">Todos os status</option>
              <option value="pátio">No Pátio</option>
              <option value="doca">Nas Docas</option>
              <option value="fila">Na Fila</option>
              <option value="finalizado">Finalizados</option>
            </select>
            <button className="btn-primary">➕ Nova Autorização</button>
          </div>
        </div>

        <div className="table-container">
          <table className="veiculos-table">
            <thead>
              <tr>
                <th>Placa</th>
                <th>Status</th>
                <th>Doca</th>
                <th>Data Chegada</th>
                <th>Data Saída</th>
                <th>Liberado por</th>
                <th>Tipo Processo</th>
                <th>Peso Entrada</th>
                <th>Peso Saída</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {veiculosFiltrados.map(veiculo => (
                <tr key={veiculo.id} className={veiculo.status === 'Finalizado' ? 'finalizado' : ''}>
                  <td className="placa">{veiculo.placa}</td>
                  <td>
                    <span className={`status-badge status-${veiculo.status.toLowerCase().replace(' ', '-')}`}>
                      {veiculo.status}
                    </span>
                  </td>
                  <td>{veiculo.doca}</td>
                  <td>{veiculo.dataChegada}</td>
                  <td>{veiculo.dataSaida}</td>
                  <td>{veiculo.liberadoPor}</td>
                  <td>{veiculo.tipoProcesso}</td>
                  <td>{veiculo.pesoEntrada}</td>
                  <td>{veiculo.pesoSaida}</td>
                  <td>
                    <button className="btn-icon" title="Editar">✏️</button>
                    <button className="btn-icon" title="Registrar peso">⚖️</button>
                    <button className="btn-icon" title="Finalizar">✅</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumo das Docas */}
      <div className="docas-section">
        <h3>🏭 Status das Docas</h3>
        <div className="docas-grid">
          <div className="doca-card ocupada">
            <h4>Doca 1</h4>
            <p>🚛 MNO-3456</p>
            <span>Descarga - 75%</span>
          </div>
          <div className="doca-card disponivel">
            <h4>Doca 2</h4>
            <p>✅ Disponível</p>
          </div>
          <div className="doca-card ocupada">
            <h4>Doca 3</h4>
            <p>🚛 XYZ-5678</p>
            <span>Descarga - 30%</span>
          </div>
          <div className="doca-card manutencao">
            <h4>Doca 4</h4>
            <p>🔧 Em manutenção</p>
          </div>
          <div className="doca-card disponivel">
            <h4>Doca 5</h4>
            <p>✅ Disponível</p>
          </div>
        </div>
      </div>

      {/* Alertas e notificações */}
      <div className="alertas-section">
        <h3>⚠️ Alertas</h3>
        <div className="alertas-list">
          <div className="alerta warning">
            <span>⏰ Veículo ABC-1234 aguardando há mais de 2 horas</span>
          </div>
          <div className="alerta info">
            <span>📋 3 autorizações pendentes de aprovação</span>
          </div>
          <div className="alerta success">
            <span>✅ Doca 2 liberada para novo veículo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;