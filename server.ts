import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("metroflow.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    password TEXT,
    role TEXT,
    sector TEXT
  );
`);

// Migration: Add machine column to users if it doesn't exist
const tableInfo = db.prepare("PRAGMA table_info(users)").all();
const hasMachineColumn = tableInfo.some((col: any) => col.name === 'machine');
if (!hasMachineColumn) {
  db.exec("ALTER TABLE users ADD COLUMN machine TEXT");
  console.log("[DB] Coluna 'machine' adicionada à tabela 'users'.");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS instruments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    type TEXT,
    description TEXT,
    range TEXT,
    manufacturer TEXT,
    category TEXT,
    last_calibration DATE,
    periodicity_months INTEGER,
    next_calibration DATE,
    status TEXT,
    current_sector TEXT,
    current_responsible TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS calibrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instrument_id INTEGER,
    date DATE,
    result TEXT,
    responsible TEXT,
    certificate_url TEXT,
    notes TEXT,
    FOREIGN KEY(instrument_id) REFERENCES instruments(id)
  );

  CREATE TABLE IF NOT EXISTS movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instrument_id INTEGER,
    from_sector TEXT,
    to_sector TEXT,
    responsible TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(instrument_id) REFERENCES instruments(id)
  );
`);

// Bulk Import Helper
function parseDate(dateStr: string) {
  if (!dateStr || dateStr.trim() === "" || dateStr === "0") return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  let [day, month, year] = parts;
  if (year.length === 2) year = "20" + year;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Seed Users
const seedUsers = () => {
  const users = [
    { name: "Jefferson Vieira", password: "Link4580", role: "admin", sector: "Administração" },
    { name: "Adilson", password: "123", role: "production", sector: "Produção" },
    { name: "Luciano", password: "123", role: "production", sector: "Produção" },
    { name: "Junior Piquê", password: "123", role: "production", sector: "Produção" },
    { name: "Leandro", password: "123", role: "production", sector: "Produção" }
  ];

  const insert = db.prepare("INSERT OR IGNORE INTO users (name, password, role, sector, machine) VALUES (?, ?, ?, ?, ?)");
  for (const user of users) {
    insert.run(user.name, user.password, user.role, user.sector, "");
  }
  console.log("[SEED] Usuários verificados/criados.");
};

seedUsers();

const bulkData = `
ANE-001	Anel Padrão	17,015mm	Tesa	15/10/25	24	15/10/27	
ANE-002	Anel Padrão	10mm	Tesa	10/01/24	24	10/01/26	NA FILA
ANE-003	Anel Padrão	5mm		10/01/24	24	10/01/26	NA FILA
ANE-004	Anel Padrão	4,996mm		10/01/24	24	10/01/26	NA FILA
COM-002	Medidor de Conicidade interna	0-1mm	Pittsburgh, PA	16/12/24	12	16/12/25	NA FILA
COM-003	Medidor de Conicidade	15-35mm	Digimess	16/01/26	12	16/01/27	
COM-004	Medidor de Conicidade	0 - 1"	Allen Gauges	15/10/25	12	15/10/26	
COM-005	Medidor de Conicidade	35 - 55mm		16/12/24	12	16/12/25	NA FILA
COM-006	Medidor de Coinicidade	10 - 30mm	Digimess	16/12/24	12	16/12/25	NA FILA
DB-001	DURÔMETRO DE BANCADA (HRB/HRC)			29/02/24			
DP-001	DURÔMETRO PORTÁTIL (HBW)	 		29/02/24			
DUR-004	BLOCO PADRÃO 215 HBW			09/11/24			
DUR-008 	BLOCO PADRÃO 62 HRC			09/11/24			
DUR-010	BLOCO PADRÃO 62.5 HRB			09/11/24			
DUR-011	BLOCO PADRÃO 84 HRB			09/11/24			
DUR-012	BLOCO PADRÃO 305 HBW			09/11/24			
DUR-013	BLOCO PADRÃO 207 HBW			09/11/24			
DUR-091	BLOCO PADRÃO 33 HRC			23/10/24			
GAG-004	Ball Gage	0 - 0,15	Gagemaker	30/04/25	12	30/04/26	
GAG-005	Ball Gage	0 -3 in	Gagemaker	30/04/25	12	30/04/26	
GAG-010	Relogio Comparador	0 - 0,25	Gagemaker	16/12/24	12	16/12/25	NA FILA
GS-001	Gausímetro			23/05/24			
HAS-001	Haste Padrão	25mm		03/03/23	60	03/03/28	
HAS-003	Haste Padrão	100mm		03/03/23	60	03/03/28	
HAS-008	Haste Padrão	75mm		21/11/24	60	21/11/29	
HAS-010	Haste Padrão (Conjunto)	75-200-250-275mm		15/05/24	60	15/05/29	
HAS-010	Haste Padrão	225mm		15/05/24	60	15/05/29	
HAS-011	Haste Padrão	125mm		13/03/23	60	13/03/28	
HAS-012	Haste Padrão	150mm		08/01/24	60	08/01/29	
HAS-013	Haste Padrão	175mm		08/01/24	60	08/01/29	
HAS-014	Haste Padrão (Conjunto)	100-125mm	Mitutoyo	31/05/23	60	31/05/28	
HAS-015	Haste Padrão (Conjunto)	200-225-250-mm	Mitutoyo	13/03/23	60	13/03/28	
HAS-016	Haste Padrão (Conjunto)	300-325-350-375mm	Mitutoyo	31/05/23	60	31/05/28	
HAS-017	Haste Padrão 	400-425-450-475mm	Mitutoyo	31/05/23	60	31/05/28	
HAS-018	Haste Padrão 	500mm		08/01/24	60	08/01/29	
HAS-020	Haste Padrão	150mm		08/01/24	60	08/01/29	
HAS-021	Haste Padrão (Conjuto)	625 - 675mm		08/01/24	60	08/01/29	
HAS-022	Haste Padrão (Conjunto)	725- 775mm		08/01/24	60	08/01/29	
HAS-023	Haste Padrão (Conjunto)	525mm	Mitutoyo	23/08/23	60	23/08/28	
HAS-024	Haste Padrão (Conjunto)	925-975mm		08/01/24	60	08/01/29	
HAS-026	Haste Padrão (Conjunto)	325 - 375mm		08/01/24	60	08/01/29	
HAS-027	Haste Padrão 	125mm	Pantec	16/03/23	60	16/03/28	
HAS-027	Haste Padrão	175mm	Pantec	08/01/24	60	08/01/29	
HAS-028	Haste Padrão (Conjunto)	425-475-575-mm		31/05/23	60	31/05/28	
HAS-028	Haste Padrão (Conjunto)	425- 475mm		08/01/24	60	08/01/29	
HAS-030	Haste Padrão	25mm		08/01/24	60	08/01/29	
HAS-031	Haste Padrão (Conjunto)	525 - 575mm		08/01/24	60	08/01/29	
HAS-033	Haste Padrão (conjunto)	25-25mm		31/05/23	60	31/05/28	
HAS-033	Haste Padrão	25mm		08/01/24	60	08/01/29	
HAS-034	Haste Padrão (Conjunto)	100-125-150-175mm		12/09/24	60	12/09/29	
HAS-035	Haste Padrão	25mm		08/01/24	60	08/01/29	
HAS-036	Haste Padrão 	100mm		21/11/24	60	21/11/29	
HAS-037	Haste Padrão	150mm		08/01/24	60	08/01/29	
HAS-038	Haste Padrão	175mm		08/01/24	60	08/01/29	
HAS-039	Haste Padrão 	525mm		08/01/24	60	08/01/29	
HAS-060	Haste Padrão	375mm		31/05/23	60	31/05/28	
HAS-060	Haste Padrão	325mm		08/01/24	60	08/01/29	
HAS-063	Haste Padrão (conjunto)			03/05/23	60	03/05/28	
HAS-063	Haste Padrão	275mm		08/01/24	60	08/01/29	
HAS-293	Haste Padrão	100mm		08/01/24	60	08/01/29	
IMI-001	Micrômetro Interno (Imicro)	17 - 20mm		16/12/24	12	16/12/25	NA FILA
IMI-002	Micrômetro Interno (Imicro)	10 - 12mm	Tesa	30/06/25	12	30/06/26	
IMI-004	Micrômetro Interno (Imicro)	14 - 17mm	Mitutoyo	16/10/25	12	16/10/26	
IMI-005	Micrômetro Interno (Imicro)	4,5 - 5,5mm	Digimess	16/10/25	12	16/10/26	
IMI-006	Micrometro Interno (Imicro)	8 - 10mm	Digimess	28/10/25	12	28/10/26	
IMI-007	Micrometro Interno (Imicro)	12 - 16mm	Digimess	28/10/25	12	28/10/26	
IMI-008	Micrometro Interno (Imicro)	6 - 8mm	Digimess	29/05/25	12	29/05/26	
LUP-001	Lupa Portátil			29/02/24			
LUX-001	Luxímetro			27/08/24			
MIC-001	Micrômetro Externo	25 - 50	Mitutoyo	28/05/25	12	28/05/26	
MIC-002	Micrômetro Externo	25 - 50mm		26/06/25	12	26/06/26	
MIC-003	Micrômetro Externo	200 - 300mm	Digimess	28/05/25	12	28/05/26	
MIC-004	Micrômetro Externo	25 - 50mm		29/04/25	12	29/04/26	
MIC-005	Micrometro Externo 	50 - 75mm		22/10/25	12	22/10/26	
MIC-006	Micrômetro Externo	125 - 150mm	Digimess	30/04/25	12	30/04/26	
MIC-007	Micrômetro Externo de Lâmina	75 - 100mm	Digimess	03/12/25	12	03/12/26	
MIC-008	Micrômetro Externo	50 - 75mm	Digimess	30/04/25	12	30/04/26	
MIC-009	Micrômetro Externo	50 - 75mm	Mitutoyo	30/04/25	12	30/04/26	
MIC-010	Micrômetro Externo	75 - 100	Digimess	31/03/25	12	31/03/26	
MIC-011	Micrômetro Externo	300 - 400mm	Mitutoyo	05/06/25	12	05/06/26	
MIC-012	Micrômetro Externo	400 - 500mm	Mitutoyo	27/06/25	12	27/06/26	
MIC-014	Micrômetro Externo	300 - 400mm	Pantec	29/05/25	12	29/05/26	
MIC-015	Micrômetro Externo	200 - 300mm	Mitutoyo	30/04/25	12	30/04/26	
MIC-016	Micrômetro Externo	0 - 25mm	Mitutoyo	28/05/25	12	28/05/26	
MIC-017	Micrômetro Externo	0 - 25mm		05/12/24	12	05/12/25	NA FILA
MIC-019	Micrômetro Externo	0 - 25mm	Digimess	16/12/24	12	16/12/25	
MIC-020	Micrômetro Externo	25 - 50mm		29/04/25	12	29/04/26	
MIC-021	Micrômetro Externo	100 - 125mm		28/05/25	12	28/05/26	
MIC-023	Micrômetro Externo	0 - 25mm	Shan	16/01/26	12	16/01/27	
MIC-026	Micrômetro Externo	75 - 100mm	Shan	26/06/25	12	26/06/26	
MIC-027	Micrômetro Externo	100 - 125mm	Shan	30/04/25	12	30/04/26	
MIC-028	Micrômetro Externo	0 - 25mm	Digimess	16/01/25	12	16/01/26	
MIC-029	Micrômetro Externo	175 - 200mm	Shan	30/04/25	12	30/04/26	
MIC-031	Micrômetro Externo de Lâmina	50 - 75mm	Digimess	03/12/25	12	03/12/26	
MIC-032	Micrometro Externo 	0 - 25mm	Digimess	28/05/25	12	28/05/26	
MIC-034	Micrômetro Externo	100 - 200mm	Digimess	15/10/25	12	15/10/26	
MIC-038	Micrômetro Externo	125 - 150mm		30/04/25	12	30/04/26	
MIC-039	Micrômetro Externo	150 - 175mm		30/04/25	12	30/04/26	
MIC-042	Micrômetro Externo	800 - 900mm	Pantec	31/03/25	12	31/03/26	
MIC-046	Micrômetro Externo	0 - 25mm	Pantec	26/06/25	12	26/06/26	
MIC-048	Micrômetro Externo	400 - 500mm	Pantec	29/05/25	12	29/05/26	
MIC-049	Micrômetro Externo de Lâmina	100 - 125mm	Digimess	30/04/25	12	30/04/26	
MIC-050	Micrômetro Externo	25 - 50mm	Pantec	16/01/25	12	16/01/26	
MIC-052	Micrômetro Externo	50 - 75mm	Mitutoyo	26/06/25	12	26/06/26	
MIC-055	Micrômetro Externo	25 - 50mm	Digimess	31/03/25	12	31/03/26	
MIC-056	Micrômetro Externo de Lâmina	25 - 50mm	Digimess	27/06/25	12	27/06/26	
MIC-059	Micrômetro Externo	500 - 600mm	Digimess	28/04/25	12	28/04/26	
MIC-060	Micrômetro Externo	300 - 400mm	Digimess	05/06/25	12	05/06/26	
MIC-061	Micrômetro Externo	700 - 800mm	Digimess	02/04/25	12	02/04/26	
MIC-063	Micrômetro Externo	200 - 300mm	Digimess	27/06/25	12	27/06/26	
MIC-064	Micrômetro Externo	600 - 700mm	Digimess	05/06/25	12	05/06/26	
MIC-066	Micrometro Externo 	400 - 500mm	Digimess	29/05/25	12	29/05/26	
MIC-068	Micrômetro Externo	500 - 600mm	Digimess	27/06/25	12	27/06/26	
MIC-069	Micrômetro Externo	0 - 25mm	Digimess	16/01/26	12	16/01/27	
MIC-070	Micrômetro Externo	25 - 50mm	Digimess	27/06/25	12	27/06/26	
MIC-071	Micrometro Externo (milesimal)	50 - 75mm	Digimess	05/12/24	12	05/12/25	
MIC-072	Micrômetro Externo	600 - 700mm	Digimess	16/12/24	12	16/12/25	
MIP-002	Micrômetro de Profundidade	0 - 150mm	Steinmeyer	27/06/25	12	27/06/26	
MIP-005	Micrômetro de Profundidade	0 - 25mm	Mitutoyo	16/12/24	12	16/12/25	NA FILA
MIR-001	Micrômetro Externo de Rosca	0 - 25mm	Mitutoyo	20/02/25	12	20/02/26	
MIR-002	Micrômetro Externo de Rosca	50 - 75mm	Mitutoyo	16/12/24	12	16/12/25	
MIR-003	Micrômetro Externo de Rosca	25 - 50mm	Mitutoyo	31/03/25	12	31/03/26	
MIR-004	Micrômetro Externo de Rosca	75 - 100mm	Digimess	16/12/24	12	16/12/25	
MIR-005	Micrômetro Externo de Rosca	100 - 125mm	Digimess	30/04/25	12	30/04/26	
MIR-006	Micrômetro Externo de Rosca	175 - 200mm	Digimess	16/12/24	12	16/12/25	
MIR-007	Micrômetro Externo de Rosca	125 - 150mm	Digimess	16/01/26	12	16/01/27	
MIR-008	Micrometro Externo de Rosca	0 - 25mm	Digimess	16/12/24	12	16/12/25	
MIT-002	Micrometro Interno Tubular	50 - 600	Digimess	16/12/24	12	16/12/25	
MPR-001	Relogio Comparador Analogico	0 - 0,2 in	Gagemaker	29/04/25	12	29/04/26	
PAD-001	Paquímetro Universal Digital	0 - 200mm	Digimess	20/02/25	12	20/02/26	
PAD-003	Paquimetro Universal Digital	0 - 300mm	Digimess	31/03/25	12	31/03/26	
PAD-004	Paquimetro Universal Digital	0 - 200mm	Digimess	20/02/25	12	20/02/26	
PAD-006	Paquimetro Universal Digital	0 - 200mm	Digimess	03/12/25	12	03/12/26	
PAD-007	Paquímetro Universal Digital	0 - 300mm	Messen	15/10/25	12	15/10/26	
PAD-008	Paquímetro Universal Digital	0 - 300mm	Messen	27/06/25	12	27/06/26	
PAD-009	Paquímetro Universal Digital	0 - 300mm	Digimess	30/04/25	12	30/04/26	
PAD-010	Paquímetro Universal Digital	0 - 300mm	Digimess	30/04/25	12	30/04/26	
PAD-011	Paquímetro Universal Digital	0 - 300mm	Digimess	30/04/25	12	30/04/26	
PAD-013	Paquímetro Universal Digital	0 - 200mm	Messen	27/06/25	12	27/06/26	
PAD-015	Paquimetro Universal Digital	0 - 200mm	Digimess	31/03/25	12	31/03/26	
PAD-016	Paquimetro Universal Digital	0 - 200mm	Digimess	30/04/25	12	30/04/26	
PAD-017	Paquímetro Universal Digital	0 - 600mm	Digimess	16/12/24	12	16/12/25	
PAD-020	Paquimetro Universal Digital	0 - 300mm 	Digimess	29/05/25	12	29/05/26	
PAD-021	Paquimetro Universal Digital	0 - 600mm	Digimess	29/05/25	12	29/05/26	
PAD-098	Paquimetro Universal Digital	0 - 200mm	Digimess	30/04/25	12	30/04/26	
PAD-099	Paquimetro Universal Digital	0 - 150mm	Mitutoyo	30/04/25	12	30/04/26	
PAP-001	Paquímetro de Profundidade Analógico	0 - 400mm	Etalon Rolle	31/03/25	12	31/03/26	
PAP-002	Paquímetro de Profundidade Analógico	0 - 300mm	Mitutoyo	29/04/25	12	29/04/26	
PAP-006	Paquímetro de Profundidade Analógico	0 - 500mm	Pantec	30/04/25	12	30/04/26	
PAP-007	Paquímetro de Profundidade Analógico	0 - 300mm	Digimess	27/06/25	12	27/06/26	
PAP-009	Paquímetro de Profundidade Analógico	0 - 500mm	Insize	27/06/25	12	27/06/26	
PAQ-011	Paquímetro Universal Analógio	0 - 1000mm	Shan	22/10/25	12	22/10/26	
PAQ-012	Paquímetro Universal Analógio	0 - 600mm	Digimess	16/12/24	12	16/12/25	NA FILA
PAQ-015	Paquímetro Universal Analógio	0 - 300mm	Mitutoyo	16/12/24	12	16/12/25	NA FILA
PAQ-017	Paquímetro Universal Analógio	0 - 300mm	Digimess	03/12/25	12	03/12/26	
PAQ-085	Paquímetro Universal Analógico	0 - 600mm	Digimess	03/12/25	12	03/12/26	
PAQ-086	Paquímetro Universal Analógico	0 - 600mm	Digimess	16/01/25	12	16/01/26	NA FILA
PAQ-100	Paquimetro Universal Analogico 	0 - 200mm	Digimess	29/05/25	12	29/05/26	
POF-008	Paquimetro Universal Analogico 	0 - 300mm	Mitutoyo	31/03/25	12	31/03/26	
POF-009	Paquimetro Universal Analogico 	0 - 200mm	Digimess	27/06/25	12	27/06/26	
POF-017	Paquimetro Universal Analogico 	0 - 200mm	Mitutoyo	22/10/25	12	22/10/26	
POF-020	Paquimetro Universal Analogico 	0 - 200mm	Mitutoyo	31/03/25	12	31/03/26	
POF-059	Paquímetro Universal Analógio	0 - 150mm	Mitutoyo	27/06/25	12	27/06/26	
POF-062	Paquimetro Universal Analogico 	0 - 150mm	Utsutools	27/06/25	12	27/06/26	
POF-063	Paquímetro Universal Analógico	0 - 150mm	Digimess	03/12/25	12	03/12/26	
POF-085	Paquimetro Universal Digital	0 - 300mm	Digimess	27/06/25	12	27/06/26	
POF-102	Paquimetro Universal Analogico 	0 - 200mm	Digimess	29/05/25	12	29/05/26	
POF-124	Paquimetro Universal Analogico 	0 - 200mm	Digimess	30/04/25	12	30/04/26	
POF-999	Paquímetro Universal Analógio	0 - 1500mm	Digimess	29/05/25	12	29/05/26	
PPD-001	Paquímetro de Profundidade Digital	0 - 300mm	Digimess	15/10/25	12	15/10/26	
PPD-003	Paquímetro de Profundidade Digital	0 - 500mm	Digimess	03/12/25	12	03/12/26	
PPD-005	Paquimetro de Profundidade Digital                                             	0 - 300mm	Digimess	22/10/25	12	22/10/26	
PPD-022	Paquimetro de Profundidade Digital	0 - 300mm	Digimess	03/12/25	12	03/12/26	
PRP-001	Projetor de Perfil	0 - 100mm	Mitutoyo	11/11/24	24	11/11/26	
PS-001	Pastilha Sensora			13/05/24			
PS-001	PASTILHA SENSORA PM			13/05/24			
RAD-001	RADIÔMETRO			17/06/24			
REA-001	Relogio apalpador 	0 - 0,8mm	Digimess	29/04/25	12	29/04/26	
REA-002	Relógio Apalpador 	0 - 0,8mm	Digimess	26/06/25	12	26/06/26	
REA-003	Relógio Apalpador 	0 - 0,8mm	Digimess	31/03/25	12	31/03/26	
REA-004	Relogio apalpador	0 - 0,8mm	Digimess	24/11/24	12	24/11/25	
REA-005	Relogio apalpador	0 - 0,8mm	Digimess	29/04/25	12	29/04/26	
REA-006	Relogio  apalpador	0 - 0,8mm	Digimess	16/12/24	12	16/12/25	
REA-007	Relogio Apalpador	0 - 0,8mm	Digimess	03/12/25	12	03/12/26	
REA-009	Relogio  apalpador	0 - 0,8mm	Digimess	15/10/25	12	15/10/26	
REA-010	Relogio apalpador	0 - 0,8mm	Digimess	29/04/25	12	29/04/26	
REA-011	Relogio apalpador 	0 - 0,8mm	Digimess	26/06/25	12	26/06/26	
REA-012	Relogio apalpador	0 - 0,8mm	Digimess	31/03/25	12	31/03/26	
REC-001	Relógio Comparador	0 - 10mm	Mitutoyo	29/04/25	12	29/04/26	
REC-002	Relógio Comparador	0 - 10mm	Digimess	28/05/25	12	28/05/26	
REC-003	Relógio Comparador	0 - 3mm	Pantec	29/04/25	12	29/04/26	
REC-004	Relógio Comparador	0 - 10mm	Digimess	28/05/25	12	28/05/26	
REC-006	Relógio Comparador	0 - 10mm	Digimess	31/03/25	12	31/03/26	
REC-007	Relógio Comparador	0 - 10mm	Digimess	31/03/25	12	31/03/26	
REC-008	Relógio Comparador	0 - 10mm	Digimess	26/06/25	12	26/06/26	
REC-011	Relógio Comparador	0 - 10mm	Mitutoyo	28/05/25	12	28/05/26	
REC-013	Relógio Comparador	0 - 3mm	Messen	26/06/25	12	26/06/26	
REC-029	Relógio Comparador	0 - 3mm	Digimess	16/12/24	12	16/12/25	
REC-035	Relogio Comparador 	0- 10mm	Digimess	26/06/25	12	26/06/26	
REC-036	Relógio Comparador	0 - 5mm	Pantec	30/03/25	12	30/03/26	
REC-041	Relógio Comparador	0 - 3mm	Digimess	28/05/25	12	28/05/26	
REC-042	Relógio Comparador	0 - 0,5mm	Gagemaker	29/04/25	12	29/04/26	
REC-045	Relógio Comparador	0 - 10mm	Digimess	26/06/25	12	26/06/26	
REC-046	Relógio Comparador	0 - 10mm	Digimess	29/04/25	12	29/04/26	 
REC-052	Relógio Comparador	0 - 10mm	Digimess	16/01/25	12	16/01/26	
REC-059	Relógio Comparador	0 - 10mm	Digimess	16/01/26	12	16/01/27	
REC-060	Relógio Comparador	0 - 10mm	Digimess	16/12/24	12	16/12/25	
REC-090	Relogio Comparador	0 - 3mm	Digimess	29/04/25	12	29/04/26	
RUG-001	Rugosimetro Digital 		Mitutoyo	10/01/24	24	10/01/26	
TD-001	TUBO DECANTADOR			28/10/23			
TG-001	Transferidor de Ângulo 	0 - 180		29/04/25	12	29/04/26	
TG-002	Transferidor de Angulo	0 - 180	Hol Protactor	27/06/25	12	27/06/26	
TMH-001	Termohigrômetro Digital		Exbom	16/10/2025	12	16/10/26	
TMH-002	Termohigrômetro Digital		Exbom	16/10/2025	12	16/10/26	
TRA-002	Medidor de Altura (Traçador)	0 - 300mm		30/04/25	12	30/04/26	
TRA-003	Medidor de Altura (Traçador)	0 - 300mm	Mitutoyo	03/12/25	12	03/12/26	
TRE-009	Trena	5m	Vonder		12		NA FILA
TRE-010	Trena	3m	Thompson		12			
TRE-011	Trena	3m	Thompson		12			
TRE-012	Trena	3m	Thompson		12			
TRG-004	Goniômetro	0 - 360°	Digimess	30/04/25	12	30/04/26	
TRG-005	Goniômetro	0 - 360	Digimess	03/12/25	12	03/12/26	
YK-001	YOKE			15/05/24			
CRT-07	Calibre de Rosca Tampão  (P/NP)	2-1/4''-12UN-2B	...			R3/E	OK
CRT-101	Calibre de Rosca Tampão  (P)	1-5/16"-2UN-2B	USILIDER			R3/B	OK
CRT-104	Calibre de Rosca Tampão  P/NP	1-1/8"-7UNC-2B	USILIDER			R1/B	OK
CRT-116	Calibre de Rosca Tampão  (P/NP)	1-7/8"-12UN-2B	NEOMATIC			R3/E	OK
CRT-118	Calibre de Rosca Tampão  (P/NP)	1-7/8"-8UN-2B	USILIDER			R3/A	OK
CRT-119	Calibre de Rosca Tampão  (P)	1''-8SA-2G	USILIDER			R3/D	OK
CRT-120	Calibre de Rosca Tampão  (P/NP)	M64-4-6H	USILIDER			R1/D	OK
CRT-121	Calibre de Rosca Tampão  (P/NP)	2-1/8''-8UNC-2B	USILIDER			R1/E	OK
CRT-129	Calibre de Rosca Tampão  (P)	1"-5ACME-2G	USILIDER			R3/B	OK
CRT-13	Calibre de Rosca Tampão (NP)	3/8"-18NPT 	GERMANY			R2/C	OK
CRT-135	Calibre de Rosca Tampão  (P/NP)	1-9/16"-12UN-2B	NEOMATIC			R3/A	OK
CRT-138	Calibre de Rosca Tampão  (P)	1/2''-8ACME-2G	USILIDER			R1/C	OK
CRT-139	Calibre de Rosca Tampão  (P/NP)	13/16"-16UN-2B	NEOMATIC			R2/B	OK
CRT-147	Calibre de Rosca Tampão (P/N.P)	ISO 228 G1/4" (BSP)	NEOMATIC			R1/C	OK
CRT-148	Calibre de Rosca Tampão (P/N.P)	ISO 228 G3/4" (BSP)	NEOMATIC			R2/B	OK
CRT-151	Calibre de Rosca Tampão  (P/NP)	1-1/8"-8UN-2B	NEOMATIC			R2/A	OK
CRT-153	Calibre de Rosca Tampão (P)	1.8120''-20UNS-2B	AGM			R3/B	OK
CRT-154	Calibre de Rosca Tampão  P/NP	1  1/16" 12  UN -3B	USILIDER	 		R1/B	OK
CRT-166	Calibre de Rosca Tampão (P/N.P)	1.750  5  UNC  2B	AGM			R1/E	OK
CRT-179	Calibre de Rosca Tampão  (P/NP)	7/8" 14  UNF -2B	NEOMATIC			R2/B	OK
CRT-180	Calibre de Rosca Tampão  (P)	1  1/2" 12  UNF -2B	USILIDER			R2/B	OK
CRT-184	Calibre de Rosca Tampão  (NP)	1/8" 27  NPT  L1	NEOMATIC			R2/C	OK
CRT-188	Calibre de Rosca Tampão  (NP)	1" 11-1/2 NPT	NEOMATIC			R2/C	OK
CRT-190	Calibre de Rosca Tampão (P/N.P)	M  56  X  5,5  -6H 6H   	USILIDER			R1/A	OK
CRT-193	Calibre de Rosca Tampão  (P/NP)	1  7/8" 16  UN -2B	NEOMATIC			R3/A	OK
CRT-197	Calibre de Rosca Tampão (P/NP)	1  3/16  16  UN  2B	AGM			R1/B	OK
CRT-199	Calibre de Rosca Tampão  (P)	2  3/4" 6  ACME -2G	USILIDER			R3/C	OK
CRT-206	Calibre de Rosca Tampão  (P/NP)	1  1/4" 8  UN -2B ESQ.	USILIDER			R3/C	OK
CRT-209	Calibre de Rosca Tampão  (P/NP)	5/16" 18  UNC -2B	GERMANY			R1/C	OK
CRT-21	Calibre de Rosca Tampão  (P/NP)	1  3/8  5  ACME  2G	.....			R3/B	OK
CRT-213	Calibre de Rosca Tampão  (P/NP)	3/4" 16  UNF -2B	NEOMATIC			R2/A	OK
CRT-217	Calibre de Rosca Tampão  (P/NP)	M5 X 0,8 -6H  	NEOMATIC			R1/A	OK
CRT-218	Calibre de Rosca Tampão  (P/NP)	M  16 X 2,0 -6H	NEOMATIC			R1/D	OK
CRT-219	Calibre de Rosca Tampão  (P)	3  1/2" 8  NA -2G	USILIDER			R2/C	OK
CRT-220	Calibre de Rosca Tampão (P/N.P)	1  3/4" 8  UN -2B  	USILIDER			R1/B	OK
CRT-224	Calibre de Rosca Tampão  (P/NP)	M  8 X 1,25 -6H  ESQUERDO	NEOMATIC			R1/A	OK
CRT-225	Calibre de Rosca Tampão  (P/NP)	EN10226  3/4  RC/RP 1	NEOMATIC			R2/B	OK
CRT-226	Calibre de Rosca Tampão  (P/NP)	EN10226  3/4  RC/RP 2	NEOMATIC			R2/B	OK
CRT-227	Calibre de Rosca Tampão  (NP)	EN10226 1/4 RC/RP  N2	NEOMATIC			R1/C	OK
CRT-228	Calibre de Rosca Tampão  (NP)	EN10226 1/4 RC/RP  N2	NEOMATIC			R1/C	OK
CRT-230	Calibre de Rosca Tampão  (P)	3  3/4" 8  ACME -2G	USILIDER			R2/D	OK
CRT-233	Calibre de Rosca Tampão (P/N.P)	1  1/4" 7  UNC -2B	USILIDER			R2/B	OK
CRT-236	Calibre de Rosca Tampão  (P/NP)	3/8" 24  UNF -3B	NEOMATIC			R1/C	OK
CRT-237	Calibre de Rosca Tampão  (P/NP)	1  1/8" 12  UNF -2B	NEOMATIC			R2/B	OK
CRT-24	Calibre de Rosca Tampão  (P)	1  3/8" 5  ACME -2G	USILIDER			R3/B	OK
CRT-244	Calibre de Rosca Tampão (P)	4" 16  UN -2B	NEOMATIC			R2/E	OK
CRT-245	Calibre de Rosca Tampão (NP)	4" 16  UN -2B	NEOMATIC			R2/E	OK
CRT-249	Calibre de Rosca Tampão  P/NP	1  1/8" 8  UN -2B 	NEOMATIC			R1/B	OK
CRT-251	Calibre de Rosca Tampão (P)	3  7/8" 8  UN -2B	NEOMATIC			R1/E	OK
CRT-252	Calibre de Rosca Tampão (NP)	3  7/8" 8  UN -2B	NEOMATIC			R1/E	OK
CRT-26	Calibre de Rosca Tampão  (P/NP)	3  1/2" 12  UN -2B	USILIDER			R2/D	OK
CRT-262	Calibre de Rosca Tampão  (P/NP)	2  1/2  12  UN  2B	NEOMATIC			R3/E	OK
CRT-264	Calibre de Rosca Tampão  (P)	1  1/4  5  ACME  2G	AGM			R3/D	OK
CRT-268	Calibre de Rosca Tampão  (P)	2  1/2" 4  STUB-ACME -2G	USILIDER			R3/C	OK
CRT-270	Calibre de Rosca Tampão  (P/NP)	5/8" 18  UNF -2B	NEOMATIC			R1/C	OK
CRT-271	Calibre de Rosca Tampão   (P/NP)	#8  32  UNC  2B	NEOMATIC			R1/A	OK
CRT-273	Calibre de Rosca Tampão  (P)	1" 6  NA  -2G	USILIDER			R1/B	OK
CRT-283	Calibre de Rosca Tampão  P/NP)	M  20 X 2,5 -6G	NEOMATIC			R1/D	OK
CRT-284	Calibre de Rosca Tampão  (P/NP)	M  10 X 1,5 -6G  	NEOMATIC			R1/A	OK
CRT-292	Calibre de Rosca Tampão  (P)	1  1/4" 4  STUB-ACME -2G  	USILIDER			R3/B	OK
CRT-296	Calibre de Rosca Tampão  (P)	4  4  NA  2G	AGM			R3/C	OK
CRT-300	Calibre de Rosca Tampão  (P/NP)	1  5/8  8  UN  2G	AGM			R3/D	OK
CRT-301	Calibre de Rosca Tampão  (P)	5" 16  UN -2B	NEOMATIC			R2/E	OK
CRT-302	Calibre de Rosca Tampão  (NP)	5" 16  UN -2B	NEOMATIC			R2/E	OK
CRT-319	Calibre de Rosca Tampão (P/N.P)	1  3/8" 12  UNF -2B	NEOMATIC			R3/B	OK
CRT-321	Calibre de Rosca Tampão  (P/NP)	1  3/8" 6  UNC -2B	NEOMATIC			R3/A	OK
CRT-322	Calibre de Rosca Tampão  (P/NP)	M  18 X 1,0 -6H	NEOMATIC			R1/D	OK
CRT-325	Calibre de Rosca Tampão  (P)	2  5/8" 12  UN -2B	USILIDER			R1/E	OK
CRT-326	Calibre de Rosca Tampão  (P)	3" 8  UN -2B	USILIDER			R1/E	OK
CRT-327	Calibre de Rosca Tampão  P/NP)	2  3/4" 8  UN -2B	USILIDER			R1/E	OK
CRT-328	Calibre de Rosca Tampão  (P/NP)	2  8  UN  2B	AGM			R3/D	OK
CRT-340	Calibre de Rosca Tampão  (NP)	2" 11.1/2" NPT 	-------			R2/C	OK
CRT-341	Calibre de Rosca Tampão (P)	3  API LP  WORKING	KKS			R2/C	OK
CRT-343	Calibre de Rosca Tampão  (P/NP)	M  8 X 1,25 -6H 	NEOMATIC			R1/A	OK
CRT-346	Calibre de Rosca Tampão (P/N.P)	M  4 X 0,70 -6H  	NEOMATIC			R1/A	OK
CRT-350	Calibre de Rosca Tampão  (P)	3  3/8" 8  UN -2B	USILIDER			R2/D	OK
CRT-352	Calibre de Rosca Tampão  (P)	1  3/16" 12  UN -2B	USILIDER			R2/A	OK
CRT-355	Calibre de Rosca Tampão  (NP)	3/4" 14NPT 	NEOMATIC			R2/C	OK
CRT-357	Calibre de Rosca Tampão  (P)	1,438  5  STUB  ACME  2G	AGM			R3/D	OK
CRT-36	Calibre de Rosca Tampão  (P/NP)	1.6875  20  UN  2B	AGM			R3/D	OK
CRT-361	Calibre de Rosca Tampão  (P/NP)	M  12 X 1,75 -6H  6H  	USILIDER			R1/A	OK
CRT-370	Calibre de Rosca Tampão  (P)	M  14 X 2,0	USILIDER			R1/D	OK
CRT-371	Calibre de Rosca Tampão  (P)	1" 5  ACME -2G 	USILIDER			R3/B	OK
CRT-377	Calibre  TamPão API	6  5/8  API REG ROTARY	PC LONE STAR				OK
CRT-378	Calibre de Rosca Tampão  (P)	2  3/8" 8  UN -2B	USILIDER			R3/C	OK
CRT-387	Calibre de Rosca Tampão (P/N.P)	M  22 X 1,50 -6H	KINGTOOLS			R1/D	OK
CRT-388	Calibre de Rosca Tampão  (P)	1  8  UN  3B	NEOMATIC			R2/A	OK
CRT-392	Calibre Tampão  API	7  5/8  API REG	KURODA				OK
CRT-396	Calibre de Rosca Tampão  (P/NP)	2.1/8" 12  UN -2B	USILIDER			R3/C	OK
CRT-399	Calibre de Rosca Tampão  (P)	3  3/4  6  SA  2G	AGM			R2/C	OK
CRT-40	Calibre de Rosca Tampão  (P/NP)	5/8" 11  UNC -2B ESQ.	NEOMATIC			R1/C	OK
CRT-410	Calibre de Rosca Tampão  (P)	3/4" 6  ACME -2G	USILIDER			R1/C	OK
CRT-423	Calibre de Rosca Tampão  (NP)	1  1/2  11,5  NPT  L1	NEOMATIC			R2/C	OK
CRT-434	Calibre de Rosca Tampão  (P/NP)	1  1/2" 8  UN -2B	NEOMATIC			R2/B	OK
CRT-435	Calibre de Rosca Tampão  (P)	3/4" 10  UNC -2B ESQ.	USILIDER			R1/C	OK
CRT-436	Calibre de Rosca Tampão  (P)	M  33 X 3,5 -6H6H	USILIDER			R1/D	OK
CRT-446	Calibre de Rosca Tampão  (P)	4  1/2" 8  UN -2A	USILIDER			R2/E	OK
CRT-45	Calibre de Rosca Tampão  P/NP	1  1/4" 8  UN -2B	NEOMATIC			R1/B	OK
CRT-456	Calibre de Rosca Tampão  (P/NP)	1  5/8" 12  UN -2B	NEOMATIC			R3/A	OK
CRT-460	Calibre Tampão  API	4  1/2  API IF (NC 50)	_				OK
CRT-465	Calibre de Rosca Tampão  (NP)	1/4" 18  NPT L1	NEOMATIC			R2/C	OK
CRT-492	Calibre de Rosca Tampão  (P)	1  7/16  8  UN  2B	AGM			R3/D	OK
CRT-494	Calibre de Rosca Tampão  (P/NP)	 1  1/8" 8  SA -2G	USILIDER			R3/B	OK
CRT-497	Calibre de Rosca Tampão  (P)	3/4" 8  STUB ESQ.	USILIDER			R2/A	OK
CRT-502	Calibre de Rosca Tampão  (P/NP)	M  22 X 1,50 -6H	KINGTOOLS			R1/D	OK
CRT-503	Calibre de Rosca Tampão  (P)	M  27 X 2 -4H	USILIDER			R1/D	OK
CRT-506	Calibre de Rosca Tampão  (P)	3,550" 8  SA -2G	USILIDER			R2/D	OK
CRT-507	Calibre de Rosca Tampão  (P/NP)	  #  6  32  UNC  2B  	KINGTOOLS			R1/A	OK
CRT-509	Calibre de Rosca Tampão  (P)	1  7/8" 12  UN -2A	USILIDER			R1/B	OK
CRT-511	Calibre de Rosca Tampão (P)	1-3/16''-20UNEF  	AGM			R2/A	OK
CRT-517	Calibre de Rosca Tampão (P/N.P)	9/16" 18  UNF -2B	NEOMATIC			R1/C	OK
CRT-521	Calibre de Rosca Tampão (P/N.P)	3/4" 14  NPSM -2B	NEOMATIC			R2/A	OK
CRT-522	Calibre de Rosca Tampão  (P/NP)	7/8" 9  UNC -2B	NEOMATIC			R2/B	OK
CRT-531	Calibre de Rosca Tampão (P/N.P)	M6 X 1,00 -6H  	NEOMATIC			R1/A	OK
CRT-533	Calibre de Rosca Tampão (P/N.P)	1/2" 20  UNF -2B	KTK			R1/C	OK
CRT-54	Calibre de Rosca Tampão (P/N.P)	1  3/8" 8  UN -2B	USILIDER			R1/B	OK
CRT-546	Calibre de Rosca Tampão  (P/NP)	#10 -24  UNC -2B	NEOMATIC			R1/C	OK
CRT-546	Calibre de Rosca Tampão  (P/NP)	10-24UNF-2B	NEOMATIC				OK
CRT-555	Calibre de Rosca Tampão  (P)	3  7/8" 5  ACME -2G	USILIDER			R1/E	OK
CRT-558	Calibre de Rosca Tampão  (P/NP)	1  5/16" 8  UN -2B	NEOMATIC			R3/A	OK
CRT-561	Calibre de Rosca Tampão  (P)	1  1/2  6  UNC  2B	AGM			R2/A	OK
CRT-562	Calibre de Rosca Tampão  (P)	1  1/2  6  ACME  3G	AGM			R3/D	OK
CRT-57	Calibre de Rosca Tampão  (P)	2" 4,5  UNC -2B	USILIDER			R3/C	OK
CRT-571	Calibre de Rosca Tampão  (P)	1  1/4" 12  UNF -2B	USILIDER			R1/B	OK
CRT-573	Calibre de Rosca Tampão  (P)	3/4" 20  UNF -2B	USILIDER			R2/A	OK
CRT-58	Calibre de Rosca Tampão  (P)	1  1/2  6  SA  2G	AGM			R3/D	OK
CRT-584	Calibre de Rosca Tampão (P/N.P)	1/4" 20  UNC -2B	NEOMATIC			R1/C	OK
CRT-593	Calibre de Rosca Tampão  (P)	3  1/8" 16  UNC -2B	USILIDER			R1/E	OK
CRT-594	Calibre de Rosca Tampão (P)	3-3/4''-14UNS-2B	AGM			R1/E	OK
CRT-61	Calibre de Rosca Tampão  (P/NP)	2  1/2  8  UN  2B	NEOMATIC			R3/E	OK
CRT-66	Calibre de Rosca Tampão  (P/NP)	9/16" 20  UN -2B	NEOMATIC			R1/C	OK
CRT-68	Calibre de Rosca Tampão  (P/NP)	7/16" 14  UNC -2B	NEOMATIC			R1/C	OK
CRT-699	Calibre de Rosca Tampão (P/N.P)	M  22 X 1,50 -6H	KINGTOOLS			R1/D	OK
CRT-70	Calibre de Rosca Tampão  (P)	2.1/4" 6  ACME -2G	USILIDER			R3/C	OK
CRT-700	Calibre de Rosca Tampão (P/N.P)	M  3 X 0,50 -6H  	KINGTOOLS			R1/A	OK
CRT-701	Calibre de Rosca Tampão (P/N.P)	M  3 X 0,50 -6H  	KINGTOOLS			R1/A	OK
CRT-702	Calibre de Rosca Tampão (P/N.P)	M  3 X 0,50 -6H  	KINGTOOLS			R1/A	OK
CRT-703	Calibre de Rosca Tampão (P/N.P)	  M  3  X  0,50  -6H  	KINGTOOLS			R1/A	OK
CRT-704	Calibre de Rosca Tampão (P/N.P)	M  3 X 0,50 -6H  	KINGTOOLS			R1/A	OK
CRT-707	Calibre de Rosca Tampão  (P/NP)	5/8"-11  UNC-2B	KINGTOOLS			R1/C	OK
CRT-708	Calibre de Rosca Tampão (P/N.P)	3/4" 10  UNC -2B	NEOMATIC			R2/A	OK
CRT-709	Calibre de Rosca Tampão (P/N.P)	1" 8  UNC -2B	NEOMATIC			R2/A	OK
CRT-71	Calibre de Rosca Tampão  (P)	1.7/8" 6  ACME -2G	USILIDER			R3/C	OK
CRT-735	Calibre de Rosca Tampão (P)	M  8  X  1    	AGM			R1/A	OK
CRT-738	Calibre de Rosca Tampão (P/N.P)	7/16" 20  UNF -3B	MUGRA			R1/C	OK
CRT-75	Calibre de Rosca Tampão  (P)	2  1/4  8  UN  2B	NEOMATIC			R3/E	OK
CRT-76	Calibre de Rosca Tampão  (NP)	2  1/4  8  UN  2B	NEOMATIC			R3/E	OK
CRT-810	Calibre de Rosca Tampão (P/N.P)	9/16  12  UNC  2B	...			R1/C	OK
CRT-811	Calibre de Rosca Tampão (P/N.P)	1/2''-13UNC-2B	...			R1/C	OK
CRT-812	Calibre de Rosca Tampão (P/N.P)	1/4''-20UNC-2B	-	21/11/2024		R1/C	
CRT-813	Calibre de Rosca Tampão (P/N.P)	5/8''-11UNC-2B	-	21/11/2024		R1/C	
CRT-814	Calibre de Rosca Tampão (P/N.P)	3/4''-12UN-2B	-	21/11/2024		R1/C	
CRT-815	Calibre de Rosca Tampão (P/N.P)	3/4''-10UNC-2B	-	21/11/2024		R1/C	
CRT-816	Calibre de Rosca Tampão (P/N.P)	3/8''-16UNC-2B	-	21/11/2024		R1/C	
CRT-817	Calibre de Rosca Tampão (P/N.P)	M6X1-6H	-	21/11/2024		R1/C	
CRT-818	Calibre de Rosca Tampão (P/N.P)	7/16''-20UNF-2B	-	21/11/2024		R1/C	
CRT-819	Calibre de Rosca Tampão (P/N.P)	1/4''-20UNC-2B	-	21/11/2024		R1/C	
CRT-820	Calibre de Rosca Tampão (P/N.P)	9/16''-12UNC-2B	-	21/11/2024		R1/C	
CRT-821	Calibre de Rosca Tampão (P/N.P)	M4X0.7-6H	-	21/11/2024		R1/C	
CRT-83	Calibre de Rosca Tampão  (P)	2.7/8" 8  UN -2B	USILIDER			R1/E	OK
CRT-86	Calibre de Rosca Tampão (P/N.P)	1/4" 28  UNF -2B	NEOMATIC			R1/C	OK
CRT-90	Calibre de Rosca Tampão (P/N.P)	7/16" 20  UNF -2B	NEOMATIC			R1/C	OK
CRT-94	Calibre de Rosca Tampão  (NP)	1/2" 14  NPT L1	FERRIPLAX			R2/C	OK
CRT-95	Calibre de Rosca Tampão (P/N.P)	1.11/16" 20  UN -2B	NEOMATIC			R3/A	OK
CRT-97	Calibre de Rosca Tampão  (P)	1  12  UNF  2B	NEOMATIC			R2/B	OK
CRT-03	Calibre de Rosca Anel  (P/NP)	3/4''-12UN-2A	NEOMATIC			R4/A	OK
CRT-05	Calibre de Rosca Anel  (P/NP)	2-1/8''-8UN-2A	NEOMATIC			R4/D	OK
CRT-06	Calibre de Rosca Anel  (P/NP)	2''-12UN-2A 	NEOMATIC			R4/B	OK
CRT-09	Calibre de Rosca Anel  (P/NP)	1''-12UNF-2A	NEOMATIC			R4/C	OK
CRT-107	Calibre de Rosca Anel  (P)	1  7/8''-8UN-2A	NEOMATIC			R4/E	OK
CRT-108	Calibre de Rosca Anel  (P)	2-5/8''-12UN-2A	USILIDER			R4/D	OK
CRT-113	Calibre de Rosca Anel  (P/NP)	1-9/16''-12UN-2A	NEOMATIC			R4/E	OK
CRT-115	Calibre de Rosca Anel  (P)	M60-2-6H  6H	USILIDER			R4/E	OK
CRT-117	Calibre de Rosca Anel  (P)	2-1/2''-8UN-2A	USILIDER			R4/B	OK
CRT-125	Calibre de Rosca Anel  (P/NP) ESQ)	2-3/8''-4ACME-2G	NEOMATIC			R4/D	OK
CRT-131	Calibre de Rosca Anel  (P/NP)	1-1/2''-6UNC-2A	USILIDER			R4/E	OK
CRT-143	Calibre de Rosca Anel  (P)	2''-8UN-2A	USILIDER			R4/B	OK
CRT-144	Calibre de Rosca Anel  (P)	2-7/8''-16UN-2A	NEOMATIC			R4/D	OK
CRT-146	Calibre de Rosca Anel  (P)	M64-4-6H 6H	AGM			R4/E	OK
CRT-149	Calibre de Rosca Anel  (P)	1-13/16''-20UNS-2B	USILIDER			R4/E	OK
CRT-156	Calibre de Rosca Anel  (P)	M18-1,0-6G	NEOMATIC			R4/E	OK
CRT-175	Calibre de Rosca Anel  (P/NP)	1-1/16''-12UN-2A	NEOMATIC			R4/C	OK
CRT-19	Calibre de Rosca Anel  (P/NP)	3/8''-16UNC-2A	NEOMATIC			R4/A	OK
CRT-192	Calibre de Rosca Anel  (P)	1-1/4''-8UN-2A	USILIDER			R4/E	OK
CRT-196	Calibre de Rosca Anel  (P/NP)	9/16''-18UNF-2A	NEOMATIC			R4/A	OK
CRT-201	Calibre de Rosca Anel  (P)	M56-5,5-6H  6H	USILIDER			R4/E	OK
CRT-21	Calibre de Rosca Anel  (P/NP)	1-3/8''-5ACME-2G	NEOMATIC			R4/B	OK
CRT-22	Calibre de Rosca Anel  (P/NP)	1-3/8''-5ACME-2G	NEOMATIC			R4/B	OK
CRT-221	Calibre de Rosca Anel  (P/NP)	M16-2,0-6G	NEOMATIC			R4/E	OK
CRT-223	Calibre de Rosca Anel  (P/NP)	M18-2,5-6G	NEOMATIC			R4/E	OK
CRT-23	Calibre de Rosca Anel  (P/NP)	1-750''-4NA-2G	NEOMATIC			R4/B	OK
CRT-253	Calibre de Rosca Anel  	1/4''-18NPT-L1	NEOMATIC			R4/E	OK
CRT-254	Calibre de Rosca Anel  	3/8''-18NPT-L1	NEOMATIC			R4/E	OK
CRT-255	Calibre de Rosca Anel  (P/NP)	1-1/2''-12UNF-2A	NEOMATIC			R4/B	OK
CRT-260	Calibre de Rosca Anel  (P)	2-1/4''-8UN-2A	NEOMATIC			R4/D	OK
CRT-265	Calibre de Rosca Anel  (P)	1-1/4''-5ACME-2G	NEOMATIC			R4/B	OK
CRT-266	Calibre de Rosca Anel  (P/NP)	7/16''-20UNF-2A	NEOMATIC			R4/A	OK
CRT-272	Calibre de Rosca Anel  (P)	2''-4NA-2G	USILIDER			R4/B	OK
CRT-287	Calibre de Rosca Anel  (P)	2-5/8''-5,5NA-2G	USILIDER			R4/B	OK
CRT-303	Calibre de Rosca Anel  (P/NP)	1/4''-20UNC-2A	KTK			R4/A	OK
CRT-304	Calibre de Rosca Anel  (P)	1-1/8''-8SA-2G	AGM			R4/B	OK
CRT-311	Calibre de Rosca Anel  (P/NP)	1-1/8''-7UNC-2A	NEOMATIC			R4/C	OK
CRT-331	Calibre de Rosca Anel  (P)	1-1/4''-7UN-2A	AGM	 		R4/E	OK
CRT-335	Calibre de Rosca Anel  (P)	1-5/8''-8UN-2A	AGM			R4/E	OK
CRT-34	Calibre de Rosca Anel  (P)	1-0.438''-5STUB ACME-2G	NEOMATIC			R4/B	OK
CRT-364	Calibre de Rosca Anel  (P)	1-1/16''-12UN-3A	NEOMATIC			R4/C	OK
CRT-369	Calibre de Rosca Anel  (P/NP)	1-3/16''-16UN-2A	NEOMATIC			R4/C	OK
CRT-37	Calibre de Rosca Anel  (P)	5/8''-8ACME-2G	NEOMATIC			R4/A	OK
CRT-372	Calibre de Rosca Anel  (P/NP)	1/2''-13UNC-2A	NEOMATIC			R4/A	OK
CRT-373	Calibre de Rosca Anel  (P)	1-3/4''-8UN-2A	AGM			R4/E	OK
CRT-374	Calibre de Rosca Anel  (P/NP)	1-3/4''-8UN-2A	NEOMATIC			R4/E	OK
CRT-381	Calibre Anel   API	6-5/8''-API REG ROTARY	PMC LONE ST.				OK
CRT-389	Calibre de Rosca Anel  	1/2''-14NPT	KINGTOOLS			R4/E	OK
CRT-39	Calibre de Rosca Anel  (P)  ESQ)	1-3/8''-5ACME-2G  	NEOMATIC	 	 	R4/B	OK
CRT-391	Calibre Anel  API	7-5/8''-API REG	KURODA				OK
CRT-400	Calibre de Rosca Anel  (P) ESQ)	2-1/4''-6SA-2G  	AGM			R4/B	OK
CRT-406	Calibre de Rosca Anel	1''-8UNC  3A	AGM			R4/C	OK
CRT-407	Calibre de Rosca Anel  (P/NP)	7/8''-9UNC-2A	AGM			R4/A	OK
CRT-411	Calibre de Rosca Anel  (P)	1-1/4''-12UNF-2A	NEOMATIC			R4/C	OK
CRT-412	Calibre de Rosca Anel  (P/NP)	7/8''-14UNF-2A	NEOMATIC			R4/C	OK
CRT-415	Calibre de Rosca Anel  (P/NP)	3/4''-14NPSM-2A	NEOMATIC			R4/C	OK
CRT-417	Calibre de Rosca Anel  (P/NP)	5/8''-11UNRC-2A	NEOMATIC			R4/A	OK
CRT-418	Calibre de Rosca Anel  (P/NP)	13/16''-16UN-2G	NEOMATIC			R4/A	OK
CRT-42	Calibre de Rosca Anel  (P)  ESQ)	5/8''-11UNC-2A	NEOMATIC			R4/C	OK
CRT-424	Calibre de Rosca Anel  (P/NP)	1  5/8  18  UNEF  2A	NEOMATIC			R4/E	OK
CRT-427	Calibre de Rosca Anel  (P/NP)	2  1/4  12  UN  2A	NEOMATIC			R4/D	OK
CRT-429	Calibre de Rosca Anel  (P)	1  3/16  16  UN  2A	NEOMATIC			R4/C	OK
CRT-430	Calibre de Rosca Anel  (P)	1  3/16  16  UN  2A	NEOMATIC			R4/C	OK
CRT-431	Calibre de Rosca Anel  (P)	1  1/16  12  UN  3A	NEOMATIC			R4/C	OK
CRT-432	Calibre de Rosca Anel  (P/NP)	1/2  13  UNC  2A	NEOMATIC			R4/A	OK
CRT-433	Calibre de Rosca Anel  (P/NP)	3/4  10  UNC  2A	NEOMATIC			R4/C	OK
CRT-455	Calibre de Rosca Anel  (P/NP)	1  1/2  8  UN  2A	NEOMATIC			R4/B	OK
CRT-459	Calibre Anel    API	4  1/2  API IF (NC 50)	LONE STAR				OK
CRT-508	Calibre de Rosca Anel  (P/NP)	1  14  UNS  2A	AGM			R4/B	OK
CRT-512	Calibre de Rosca Anel  (P/NP)	3/8  24  UNF  2A	NEOMATIC			R4/A	OK
CRT-52	Calibre de Rosca Anel  (P/NP)	1  3/4  12  UN   2A	AGM			R4/B	OK
CRT-524	Calibre de Rosca Anel  (P/NP)	1  5/8  12  UN  2A	AGM			R4/B	OK
CRT-530	Calibre de Rosca Anel  (P)	5  1/4  8  UNC  2A	USILIDER				OK
CRT-535	Calibre de Rosca Anel  (P)	3  8  UN  2A	AGM			R4/D	OK
CRT-536	Calibre de Rosca Anel  (NP)	3  8  UN  2A	AGM			R4/D	OK
CRT-552	Calibre de Rosca Anel  (P/NP)	1/2  20  UNF  2A	KINGTOOLS			R4/A	OK
CRT-560	Calibre de Rosca Anel  	1/8  27  NPT  L1	NEOMATIC			R4/E	OK
CRT-589	Calibre de Rosca Anel  (P/NP)	5/8  11  UNC  2A	NEOMATIC			R4/A	OK
CRT-62	Calibre de Rosca Anel  (P/NP)	2  3/4  12  UN  2A	NEOMATIC			R4/D	OK
CRT-63	Calibre de Rosca Anel  (P/NP)	1  8  UNC  2A	NEOMATIC			R4/C	OK
CRT-67	Calibre de Rosca Anel  (P/NP)	ISSO  228G  1/4  A"  	NEOMATIC			R4/A	OK
CRT-72	Calibre de Rosca Anel  (P)	3/4  16  UNF  2A	NEOMATIC			R4/C	OK
CRT-92	Calibre de Rosca Anel  (P/NP)	1  3/8  8  UN  2A	AGM			R4/E	OK
CRT-96	Calibre de Rosca Anel  (P)	2  3/4  20  UN  2A	NEOMATIC			R4/D	OK
`;

// Logic to categorize and insert
const seedInstruments = () => {
  const count = db.prepare("SELECT COUNT(*) as count FROM instruments").get().count;
  if (count > 0) {
    console.log("[SEED] Instrumentos já existem. Pulando importação.");
    return;
  }

  const rows = bulkData.trim().split('\n');
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO instruments (code, type, description, range, manufacturer, category, last_calibration, periodicity_months, next_calibration, status, current_sector, current_responsible, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const row of rows) {
      const cols = row.split('\t');
      if (cols.length < 2) continue;

      const code = cols[0].trim();
      const description = cols[1].trim();
      const range = cols[2]?.trim() || "";
      const manufacturer = cols[3]?.trim() || "";
      const lastCal = parseDate(cols[4]?.trim());
      const periodicity = parseInt(cols[5]?.trim()) || 12;
      const nextCal = parseDate(cols[6]?.trim());
      const notes = cols[7]?.trim() || "";

      // Categorization Logic
      let category = "Instrumentos";
      let type = "Outros";

      if (code.startsWith('ANE')) { category = "Calibres Anel"; type = "Anel"; }
      else if (code.startsWith('CRT')) { 
        if (description.toLowerCase().includes('anel')) { category = "Calibres Anel"; type = "Anel"; }
        else { category = "Calibres Tampão"; type = "Tampão"; }
      }
      else if (code.startsWith('MIC') || code.startsWith('MIR') || code.startsWith('IMI') || code.startsWith('MIP')) { type = "Micrômetro"; }
      else if (code.startsWith('PAQ') || code.startsWith('PAD') || code.startsWith('PAP') || code.startsWith('POF') || code.startsWith('PPD')) { type = "Paquímetro"; }
      else if (code.startsWith('REC') || code.startsWith('REA') || code.startsWith('MPR')) { type = "Relógio"; }
      else if (code.startsWith('HAS')) { category = "Hastes Padrão"; type = "Haste"; }
      else if (code.startsWith('DUR') || code.startsWith('DB') || code.startsWith('DP')) { category = "Durômetros / Blocos"; type = "Durômetro"; }
      else if (code.startsWith('COM')) { type = "Conicidade"; }

      // Status Logic
      let status = "OK";
      if (nextCal) {
        const nextDate = new Date(nextCal);
        const today = new Date();
        const warningDate = new Date();
        warningDate.setDate(today.getDate() + 30);

        if (nextDate < today) status = "VENCIDO";
        else if (nextDate <= warningDate) status = "ALERTA";
      }

      try {
        insertStmt.run(
          code, 
          type, 
          description, 
          range, 
          manufacturer, 
          category, 
          lastCal, 
          periodicity, 
          nextCal, 
          status, 
          "Instrumentação", 
          "", 
          notes
        );
      } catch (e) {
        console.error(`Erro ao importar ${code}:`, e);
      }
    }
  })();
  console.log("[SEED] Importação de instrumentos concluída!");
};

seedInstruments();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth API
  app.post("/api/login", (req, res) => {
    const { name, password } = req.body;
    console.log(`[AUTH] Tentativa de login para: ${name}`);
    
    if (!name || !password) {
      return res.status(400).json({ error: "Nome e senha são obrigatórios" });
    }

    try {
      const user = db.prepare("SELECT * FROM users WHERE name = ? AND password = ?").get(name, password);
      if (user) {
        console.log(`[AUTH] Login bem-sucedido: ${name}`);
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } else {
        console.log(`[AUTH] Falha no login: ${name} (Credenciais incorretas)`);
        res.status(401).json({ error: "Usuário ou senha incorretos" });
      }
    } catch (err) {
      console.error(`[AUTH] Erro no banco de dados:`, err);
      res.status(500).json({ error: "Erro interno no servidor" });
    }
  });

  // Instruments API
  app.get("/api/instruments", (req, res) => {
    const instruments = db.prepare("SELECT * FROM instruments").all();
    res.json(instruments);
  });

  app.post("/api/instruments", (req, res) => {
    const { code, type, description, range, manufacturer, category, last_calibration, periodicity_months, current_sector } = req.body;
    
    // Simple date calculation for next_calibration
    const lastDate = new Date(last_calibration);
    lastDate.setMonth(lastDate.getMonth() + parseInt(periodicity_months));
    const next_calibration = lastDate.toISOString().split('T')[0];
    
    const status = new Date(next_calibration) < new Date() ? "VENCIDO" : "OK";

    try {
      const info = db.prepare(`
        INSERT INTO instruments (code, type, description, range, manufacturer, category, last_calibration, periodicity_months, next_calibration, status, current_sector, current_responsible)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(code, type, description, range, manufacturer, category, last_calibration, periodicity_months, next_calibration, status, current_sector, "");
      res.json({ id: info.lastInsertRowid });
    } catch (err) {
      res.status(400).json({ error: "Erro ao cadastrar instrumento (Código duplicado?)" });
    }
  });

  app.patch("/api/instruments/:id/move", (req, res) => {
    const { id } = req.params;
    const { to_sector, responsible } = req.body;
    
    const instrument = db.prepare("SELECT current_sector FROM instruments WHERE id = ?").get(id);
    if (!instrument) return res.status(404).json({ error: "Não encontrado" });

    const update = db.transaction(() => {
      db.prepare("UPDATE instruments SET current_sector = ?, current_responsible = ? WHERE id = ?").run(to_sector, responsible, id);
      db.prepare("INSERT INTO movements (instrument_id, from_sector, to_sector, responsible) VALUES (?, ?, ?, ?)").run(id, instrument.current_sector, to_sector, responsible);
    });
    
    update();
    res.json({ success: true });
  });

  app.post("/api/instruments/:id/calibrate", (req, res) => {
    const { id } = req.params;
    const { date, result, responsible, notes } = req.body;
    
    const instrument = db.prepare("SELECT periodicity_months FROM instruments WHERE id = ?").get(id);
    if (!instrument) return res.status(404).json({ error: "Não encontrado" });

    const nextDate = new Date(date);
    nextDate.setMonth(nextDate.getMonth() + instrument.periodicity_months);
    const next_calibration = nextDate.toISOString().split('T')[0];
    const status = new Date(next_calibration) < new Date() ? "VENCIDO" : "OK";

    const update = db.transaction(() => {
      db.prepare("INSERT INTO calibrations (instrument_id, date, result, responsible, notes) VALUES (?, ?, ?, ?, ?)").run(id, date, result, responsible, notes);
      db.prepare("UPDATE instruments SET last_calibration = ?, next_calibration = ?, status = ? WHERE id = ?").run(date, next_calibration, status, id);
    });
    
    update();
    res.json({ success: true });
  });

  app.get("/api/instruments/:id/history", (req, res) => {
    const { id } = req.params;
    const calibrations = db.prepare("SELECT * FROM calibrations WHERE instrument_id = ? ORDER BY date DESC").all(id);
    const movements = db.prepare("SELECT * FROM movements WHERE instrument_id = ? ORDER BY date DESC").all(id);
    res.json({ calibrations, movements });
  });

  app.get("/api/history/all", (req, res) => {
    const calibrations = db.prepare("SELECT * FROM calibrations ORDER BY date DESC LIMIT 100").all();
    const movements = db.prepare("SELECT * FROM movements ORDER BY date DESC LIMIT 100").all();
    res.json({ calibrations, movements });
  });

  // Operators API
  app.get("/api/operators", (req, res) => {
    const operators = db.prepare("SELECT id, name, role, sector, machine FROM users").all();
    res.json(operators);
  });

  app.post("/api/operators", (req, res) => {
    const { name, sector, machine } = req.body;
    try {
      const info = db.prepare("INSERT INTO users (name, password, role, sector, machine) VALUES (?, ?, ?, ?, ?)")
        .run(name, "123", "operator", sector, machine);
      res.json({ id: info.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Erro ao cadastrar operador" });
    }
  });

  app.delete("/api/operators/:id", (req, res) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Dashboard Stats
  app.get("/api/stats", (req, res) => {
    const total = db.prepare("SELECT COUNT(*) as count FROM instruments").get().count;
    const expired = db.prepare("SELECT COUNT(*) as count FROM instruments WHERE status = 'VENCIDO'").get().count;
    const warning = db.prepare("SELECT COUNT(*) as count FROM instruments WHERE status = 'OK' AND next_calibration <= date('now', '+30 days')").get().count;
    const inUse = db.prepare("SELECT COUNT(*) as count FROM instruments WHERE current_responsible != ''").get().count;
    
    res.json({ total, expired, warning, inUse });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  
  return app;
}

const appPromise = startServer();

export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
