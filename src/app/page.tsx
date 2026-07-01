import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ClientLandingPage() {
  return (
    <div className="landing-wrapper">
      <header className="landing-header">
        <div className="container">
          <div className="logo-group" style={{ alignItems: "center" }}>
            <h1 className="logo-title" style={{ fontSize: "1.4rem" }}>
              Next.hub <span>| Studio</span>
            </h1>
            <p className="logo-subtitle">Design de Interiores</p>
          </div>
        </div>
      </header>

      <main className="landing-main">
        <div className="landing-content">
          <div className="editorial-tag">Exclusividade & Elegância</div>
          <h2 className="editorial-title">
            Transforme seu espaço com quem entende de sofisticação
          </h2>
          <p className="editorial-paragraph">
            Conecte-se agora mesmo com uma de nossas designers de interiores especialistas de plantão. 
            Clique no botão abaixo para dar o primeiro passo na realização do projeto dos seus sonhos.
          </p>

          <div className="cta-container">
            <Link href="/go" className="whatsapp-cta-btn">
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className="whatsapp-icon"
              >
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.451L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 2.01 14.12 1.01 11.999 1.01c-5.442 0-9.866 4.372-9.87 9.802 0 1.63.45 3.22 1.302 4.621L2.4 20.6l5.247-1.376zM17.52 14.3c-.302-.15-1.786-.881-2.056-.979-.27-.099-.467-.148-.662.15-.195.297-.757.98-.927 1.178-.17.199-.341.223-.643.073-.302-.15-1.276-.47-2.43-1.499-.899-.8-1.505-1.79-1.682-2.09-.177-.3-.019-.462.13-.61.135-.133.302-.35.452-.524.151-.174.2-.298.302-.497.102-.198.051-.373-.026-.523-.077-.15-.662-1.597-.907-2.188-.239-.572-.482-.494-.662-.503-.17-.008-.367-.01-.563-.01-.196 0-.517.073-.787.37-.27.297-1.03 1.007-1.03 2.457 0 1.45 1.053 2.852 1.2 3.05.148.199 2.072 3.165 5.018 4.44.7.304 1.247.486 1.672.62.705.224 1.346.193 1.854.117.564-.084 1.787-.73 2.039-1.436.252-.706.252-1.312.176-1.436-.076-.124-.27-.198-.572-.348z" />
              </svg>
              Falar com um Designer
            </Link>
            <p className="cta-disclaimer">
              Você será direcionado automaticamente ao WhatsApp do profissional da vez.
            </p>
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} Next.hub Studio. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
