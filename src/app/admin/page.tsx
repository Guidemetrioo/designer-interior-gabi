"use client";

import { useEffect, useState, useMemo } from "react";

interface Seller {
  id: number;
  name: string;
  phone: string;
  message: string | null;
  active: boolean;
  leadsCount: number;
  lastAssignedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LeadLog {
  id: number;
  sellerId: number;
  sellerName: string;
  sellerPhone: string;
  createdAt: string;
  clientIp: string | null;
  userAgent: string | null;
}

interface DashboardData {
  sellers: Seller[];
  totalLeads: number;
  recentLogs: LeadLog[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    sellers: [],
    totalLeads: 0,
    recentLogs: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form / Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingSellerId, setEditingSellerId] = useState<number | null>(null);
  
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formLeadsCount, setFormLeadsCount] = useState(0);

  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success",
  });

  // Client-side host for redirection link
  const [redirectLink, setRedirectLink] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setRedirectLink(`${window.location.origin}/go`);
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sellers");
      if (!res.ok) throw new Error("Erro ao carregar dados do servidor");
      const jsonData = await res.json();
      setData(jsonData);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Erro desconhecido");
      showToast(err.message || "Erro de conexão", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  // Determine who is next in line based on same logic as redirect endpoint
  const nextSellerId = useMemo(() => {
    const activeSellers = data.sellers.filter((s) => s.active);
    if (activeSellers.length === 0) return null;

    const sorted = [...activeSellers].sort((a, b) => {
      if (a.leadsCount !== b.leadsCount) {
        return a.leadsCount - b.leadsCount;
      }
      const timeA = a.lastAssignedAt ? new Date(a.lastAssignedAt).getTime() : 0;
      const timeB = b.lastAssignedAt ? new Date(b.lastAssignedAt).getTime() : 0;
      return timeA - timeB;
    });

    return sorted[0]?.id;
  }, [data.sellers]);

  const handleOpenCreateModal = () => {
    setModalMode("create");
    setFormName("");
    setFormPhone("");
    setFormMessage("Olá! Gostaria de fazer um orçamento de design de interiores.");
    setFormActive(true);
    setFormLeadsCount(0);
    setEditingSellerId(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (seller: Seller) => {
    setModalMode("edit");
    setEditingSellerId(seller.id);
    setFormName(seller.name);
    setFormPhone(seller.phone);
    setFormMessage(seller.message || "");
    setFormActive(seller.active);
    setFormLeadsCount(seller.leadsCount);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !formPhone.trim()) {
      showToast("Nome e Telefone são obrigatórios", "error");
      return;
    }

    const payload = {
      name: formName,
      phone: formPhone,
      message: formMessage,
      active: formActive,
      leadsCount: formLeadsCount,
    };

    try {
      let res;
      if (modalMode === "create") {
        res = await fetch("/api/sellers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/sellers/${editingSellerId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao salvar dados");
      }

      showToast(
        modalMode === "create" ? "Vendedora adicionada com sucesso!" : "Cadastro atualizado com sucesso!",
        "success"
      );
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleToggleActive = async (seller: Seller) => {
    try {
      const updatedActive = !seller.active;
      const res = await fetch(`/api/sellers/${seller.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: updatedActive }),
      });

      if (!res.ok) {
        throw new Error("Erro ao atualizar status");
      }

      // Optimistic update
      setData((prev) => ({
        ...prev,
        sellers: prev.sellers.map((s) => (s.id === seller.id ? { ...s, active: updatedActive } : s)),
      }));

      showToast(`Vendedora ${seller.name} está agora ${updatedActive ? "Ativa" : "Inativa"}.`);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Deseja realmente remover a vendedora ${name}? Todos os logs associados serão excluídos.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/sellers/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Erro ao remover vendedora");
      }

      showToast("Vendedora removida do sistema.", "success");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleResetStats = async () => {
    if (!confirm("Aviso: Isso irá zerar o contador de todas as vendedoras e limpar o histórico de logs. Confirmar?")) {
      return;
    }

    try {
      const res = await fetch("/api/sellers", {
        method: "PUT",
      });

      if (!res.ok) {
        throw new Error("Erro ao reiniciar estatísticas");
      }

      showToast("Todas as estatísticas foram zeradas!", "success");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(redirectLink);
    showToast("Link de redirecionamento copiado!");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPhone = (phone: string) => {
    // Basic formatting for Brazilian numbers
    // e.g. 5511999999999 -> +55 (11) 99999-9999
    if (phone.startsWith("55") && phone.length >= 12) {
      const ddd = phone.substring(2, 4);
      const first = phone.substring(4, phone.length - 4);
      const last = phone.substring(phone.length - 4);
      return `+55 (${ddd}) ${first}-${last}`;
    }
    return `+${phone}`;
  };

  return (
    <>
      {/* Toast Notification */}
      <div className={`toast ${toast.show ? "show" : ""} ${toast.type === "error" ? "toast-error" : "toast-success"}`}>
        <span>{toast.message}</span>
      </div>

      <header>
        <div className="container header-content">
          <div className="logo-group">
            <h1 className="logo-title">
              Next.hub <span>| Atendimento</span>
            </h1>
            <p className="logo-subtitle">Painel de Controle</p>
          </div>
          <div>
            <button className="btn-primary" onClick={handleOpenCreateModal}>
              + Nova Vendedora
            </button>
          </div>
        </div>
      </header>

      <main className="container" style={{ flex: 1, paddingBottom: "40px" }}>
        {/* Hero Area */}
        <section className="hero">
          <div className="hero-card">
            <div className="hero-text">
              <h2>Fila de Distribuição de Leads</h2>
              <p>
                Divisão justa e igualitária de atendimentos no WhatsApp. Compartilhe o link único abaixo. 
                Cada clique direcionará o cliente de forma alternada para a vendedora com menos leads.
              </p>
            </div>
            <div className="hero-action">
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                Link de Divulgação
              </span>
              <div className="link-widget">
                <span className="link-text">{redirectLink || "Carregando..."}</span>
                <button className="btn-copy" onClick={copyToClipboard}>
                  Copiar
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Sellers Section */}
        <section>
          <div className="section-header">
            <h3>Vendedoras Cadastradas ({data.sellers.length})</h3>
            {data.sellers.length > 0 && (
              <button className="btn-secondary" onClick={handleResetStats} style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                Zerar Contadores
              </button>
            )}
          </div>

          {loading && data.sellers.length === 0 ? (
            <div className="empty-state">
              <h4>Carregando fila de atendimento...</h4>
            </div>
          ) : error ? (
            <div className="empty-state" style={{ borderColor: "var(--color-error)" }}>
              <h4 style={{ color: "var(--color-error)" }}>Ocorreu um erro</h4>
              <p>{error}</p>
              <button className="btn-primary" onClick={fetchData}>
                Tentar Novamente
              </button>
            </div>
          ) : data.sellers.length === 0 ? (
            <div className="empty-state">
              <h4>Nenhuma vendedora cadastrada</h4>
              <p>Cadastre suas vendedoras/designers para começar a distribuir os atendimentos do WhatsApp.</p>
              <button className="btn-primary" onClick={handleOpenCreateModal}>
                Cadastrar Primeira Vendedora
              </button>
            </div>
          ) : (
            <div className="dashboard-grid">
              {data.sellers.map((seller) => {
                const isNext = seller.id === nextSellerId;
                return (
                  <div
                    key={seller.id}
                    className={`seller-card ${!seller.active ? "inactive" : ""} ${isNext ? "next-in-line" : ""}`}
                  >
                    {isNext && <div className="badge-next">Próxima da Fila</div>}

                    <div className="seller-header">
                      <div className="seller-info">
                        <h4>{seller.name}</h4>
                        <div className="seller-phone">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                          {formatPhone(seller.phone)}
                        </div>
                      </div>
                      <label className="switch" title={seller.active ? "Desativar atendimento" : "Ativar atendimento"}>
                        <input
                          type="checkbox"
                          checked={seller.active}
                          onChange={() => handleToggleActive(seller)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="seller-stats">
                      <div className="stat-box">
                        <span className="stat-label">Leads Recebidos</span>
                        <span className="stat-value">{seller.leadsCount}</span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-label">Último Lead</span>
                        <span className="stat-value time" title={seller.lastAssignedAt || ""}>
                          {formatDate(seller.lastAssignedAt)}
                        </span>
                      </div>
                    </div>

                    {seller.message && (
                      <div className="seller-message-preview" title={seller.message}>
                        Mensagem: {seller.message}
                      </div>
                    )}

                    <div className="seller-actions">
                      <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }} onClick={() => handleOpenEditModal(seller)}>
                        Editar
                      </button>
                      <button className="btn-danger" style={{ padding: "6px 12px", fontSize: "0.8rem" }} onClick={() => handleDelete(seller.id, seller.name)}>
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Audit Log / History Section */}
        {data.recentLogs.length > 0 && (
          <section className="logs-section">
            <div className="section-header">
              <h3>Histórico Recente de Redirecionamentos</h3>
            </div>
            <div className="logs-card">
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Horário</th>
                      <th>Vendedora Selecionada</th>
                      <th>Telefone</th>
                      <th>Dispositivo/User Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="log-time">{formatDate(log.createdAt)}</td>
                        <td>
                          <strong>{log.sellerName}</strong>
                        </td>
                        <td>{formatPhone(log.sellerPhone)}</td>
                        <td style={{ color: "var(--color-text-muted)", fontSize: "0.8rem", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.userAgent || ""}>
                          {log.userAgent || "Desconhecido"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Modal dialog for creating/editing sellers */}
      <div className={`modal-overlay ${isModalOpen ? "open" : ""}`} onClick={handleCloseModal}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{modalMode === "create" ? "Nova Vendedora" : "Editar Vendedora"}</h3>
            <button className="btn-close" onClick={handleCloseModal}>
              &times;
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Nome da Vendedora</label>
              <input
                id="name"
                type="text"
                className="form-input"
                placeholder="Ex: Gabriela Costa"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Número do WhatsApp</label>
              <input
                id="phone"
                type="tel"
                className="form-input"
                placeholder="Ex: 55 11 99999-9999"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                required
              />
              <span className="form-help">Insira o código do país (55 para Brasil) + DDD + número. Apenas números.</span>
            </div>

            <div className="form-group">
              <label htmlFor="message">Mensagem de Boas-Vindas</label>
              <textarea
                id="message"
                className="form-input"
                placeholder="Mensagem padrão enviada pelo cliente"
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
              />
              <span className="form-help">Use <strong>[Nome]</strong> para incluir o nome da vendedora no texto de forma dinâmica.</span>
            </div>

            {modalMode === "edit" && (
              <div className="form-group">
                <label htmlFor="leadsCount">Contador de Atendimentos</label>
                <input
                  id="leadsCount"
                  type="number"
                  min="0"
                  className="form-input"
                  value={formLeadsCount}
                  onChange={(e) => setFormLeadsCount(parseInt(e.target.value, 10) || 0)}
                  required
                />
                <span className="form-help">Permite ajustar a contagem atual se necessário para equilíbrio manual.</span>
              </div>
            )}

            <div className="form-group" style={{ flexDirection: "row", gap: "10px", alignItems: "center" }}>
              <input
                id="active"
                type="checkbox"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                style={{ width: "18px", height: "18px" }}
              />
              <label htmlFor="active" style={{ cursor: "pointer", textTransform: "none" }}>Fila ativa (disponível para receber novos atendimentos)</label>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                {modalMode === "create" ? "Adicionar" : "Salvar Alterações"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
