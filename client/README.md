# CucinOne Cleaning Shifts

Web application per la gestione e la generazione automatica dei turni di pulizia. Include un sistema di punteggi, regole giornaliere personalizzabili (numero di persone per giorno), gestione utenti con ruoli (admin e user), backup/ripristino dei punteggi e generazione dei turni scaricabile in formato Markdown.

Il progetto e' completamente dockerizzato ed e' composto da:
- **Frontend**: React + Vite, servito in produzione da Nginx (porta 80 nel container, esposta come 8080 sull'host).
- **Backend**: Node.js + Express + SQLite (porta 3001).

Questa guida spiega passo passo come portare l'applicazione online su una VM di un cloud provider (l'esempio usa Oracle Cloud Infrastructure, ma i passaggi sono validi per qualsiasi VM Ubuntu su qualsiasi provider).

## Indice

1. [Prerequisiti](#1-prerequisiti)
2. [Creazione della VM su Oracle Cloud](#2-creazione-della-vm-su-oracle-cloud)
3. [Configurazione del Firewall](#3-configurazione-del-firewall)
4. [Installazione di Docker sulla VM](#4-installazione-di-docker-sulla-vm)
5. [Clonare il progetto](#5-clonare-il-progetto)
6. [Configurazione delle variabili d'ambiente](#6-configurazione-delle-variabili-dambiente)
7. [Avvio dei servizi con Docker Compose](#7-avvio-dei-servizi-con-docker-compose)
8. [Primo avvio dell'applicazione](#8-primo-avvio-dellapplicazione)
9. [Gestione quotidiana dei servizi](#9-gestione-quotidiana-dei-servizi)
10. [Aggiornare l'applicazione](#10-aggiornare-lapplicazione)
11. [Risoluzione problemi comuni](#11-risoluzione-problemi-comuni)

## 1. Prerequisiti

- Un account su un cloud provider (es. Oracle Cloud Infrastructure, che offre una fascia gratuita "Always Free").
- Una chiave SSH (pubblica/privata) per collegarti alla VM. Se non ne hai una, puoi generarla con:
  ```bash
  ssh-keygen -t rsa -b 4096
  ```
- Git installato sul tuo computer locale (per eventuali operazioni), non strettamente necessario sulla VM se scarichi il codice diversamente.

## 2. Creazione della VM su Oracle Cloud

1. Accedi alla Console di Oracle Cloud e vai su **Compute > Istanze**.
2. Clicca su **Crea istanza**.
3. Scegli un nome per l'istanza (es. `cucinone-shifts`).
4. In **Immagine e forma**, seleziona:
   - Immagine: **Ubuntu** (versione 22.04 o superiore).
   - Forma: una VM della fascia Always Free (es. `VM.Standard.E2.1.Micro` o una Ampere `VM.Standard.A1.Flex`) e' sufficiente per questo progetto.
5. In **Aggiungi chiavi SSH**, carica la tua chiave pubblica (il file che termina in `.pub`), oppure lascia che Oracle ne generi una nuova e scaricala.
6. Lascia le impostazioni di rete di default (verra' creata una VCN con una subnet pubblica) e clicca su **Crea**.
7. Attendi che l'istanza passi allo stato **In esecuzione** e annota il suo **indirizzo IP pubblico**.

Collegati alla VM via SSH dal tuo terminale:
```bash
ssh -i /percorso/della/tua/chiave-privata ubuntu@<IP_PUBBLICO_VM>
```

## 3. Configurazione del Firewall

Su Oracle Cloud il traffico viene filtrato **due volte**: dalla Security List/Network Security Group a livello di rete (VCN) e dal firewall interno della VM (`iptables`/`netfilter`, gia' preconfigurato sulle immagini Ubuntu di Oracle). Vanno aperte le porte in **entrambi i punti**.

### 3.1 Apertura delle porte a livello di VCN (Security List)

1. Nella Console Oracle Cloud vai su **Networking > Reti Virtuali Cloud**.
2. Seleziona la VCN associata alla tua istanza, poi vai su **Security Lists** (o **Network Security Groups** se ne usi uno dedicato).
3. Seleziona la Security List di default e clicca su **Aggiungi regole di ingresso**.
4. Aggiungi le seguenti regole (una per porta):

   | Origine CIDR | Protocollo | Porta di destinazione | Descrizione |
   |---|---|---|---|
   | `0.0.0.0/0` | TCP | 8080 | Accesso al frontend |
   | `0.0.0.0/0` | TCP | 3001 | Accesso diretto alle API backend (opzionale se il frontend chiama gia' il backend tramite IP pubblico) |
   | `0.0.0.0/0` | TCP | 22 | Accesso SSH (di solito gia' presente di default) |

   Se in seguito metterai un reverse proxy con HTTPS davanti all'applicazione, apri anche le porte **80** e **443** al posto di 8080/3001.

### 3.2 Apertura delle porte sul firewall interno della VM

Le immagini Ubuntu di Oracle Cloud arrivano con `iptables` configurato per bloccare tutto il traffico non esplicitamente permesso, anche se la Security List lo consente. Collegati via SSH alla VM ed esegui:

```bash
sudo iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 3001 -j ACCEPT
```

Per rendere le regole persistenti dopo un riavvio della VM:

```bash
sudo apt install iptables-persistent -y
sudo netfilter-persistent save
```

Se invece la tua distribuzione usa `ufw` come firewall (verificalo con `sudo ufw status`), usa questi comandi equivalenti:

```bash
sudo ufw allow 8080/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

## 4. Installazione di Docker sulla VM

Collegato via SSH alla VM, installa Docker Engine e il plugin Docker Compose:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Aggiungi il tuo utente al gruppo `docker` in modo da non dover usare `sudo` per ogni comando:

```bash
sudo usermod -aG docker $USER
```

Esci e ricollegati via SSH (oppure esegui `newgrp docker`) affinche' il nuovo gruppo venga applicato.

Verifica che Docker funzioni correttamente:

```bash
docker --version
docker compose version
```

## 5. Clonare il progetto

Sulla VM, clona la repository nella home dell'utente:

```bash
git clone https://github.com/<tuo-utente>/<tuo-repository>.git
cd <tuo-repository>
```

## 6. Configurazione delle variabili d'ambiente

Crea un file `.env` nella cartella principale del progetto (la stessa in cui si trova `docker-compose.yml`):

```bash
nano .env
```

Inserisci i valori adatti al tuo ambiente, sostituendo `<IP_PUBBLICO_VM>` con l'IP pubblico della tua istanza (o il tuo dominio, se ne hai uno puntato alla VM):

```
PORT=3001
NODE_ENV=production
ORIGIN1=http://<IP_PUBBLICO_VM>:8080
ORIGIN2=http://localhost:5173
SESSION_KEY=una_chiave_segreta_lunga_casuale_e_diversa_per_ogni_deploy
```

Salva ed esci (in `nano`: `CTRL+O`, `Invio`, poi `CTRL+X`).

**Nota sulla sicurezza**: genera una `SESSION_KEY` realmente casuale, ad esempio con:
```bash
openssl rand -hex 32
```

## 7. Avvio dei servizi con Docker Compose

Dalla cartella principale del progetto (dove si trova `docker-compose.yml`), avvia l'intera infrastruttura con un solo comando:

```bash
docker compose up --build -d
```

Cosa fa questo comando:
- Compila l'immagine del backend (Node.js + Express + SQLite).
- Compila l'immagine del frontend (build React con Vite, servita poi da Nginx).
- Crea/monta la cartella dati (`./server/data`) come volume persistente, cosi' il database SQLite non viene perso ai riavvii dei container.
- Avvia entrambi i container in background (`-d`).

Verifica che i container siano attivi:

```bash
docker compose ps
```

Dovresti vedere due servizi in stato `running`/`Up`: quello del backend (sulla porta 3001) e quello del frontend (sulla porta 8080).

Per controllare i log in tempo reale (utile per il primo avvio o per debug):

```bash
docker compose logs -f
```

Premi `CTRL+C` per uscire dalla visualizzazione dei log (i container restano comunque attivi in background).

## 8. Primo avvio dell'applicazione

1. Apri il browser e vai a `http://<IP_PUBBLICO_VM>:8080`.
2. Al primo accesso il database e' vuoto: l'applicazione mostrera' automaticamente una schermata di **inizializzazione del sistema**, che chiede di creare il primo account amministratore (nome utente e password).
3. Crea l'account amministratore ed effettua il login.
4. Da loggato come admin, accedi alla sezione di gestione (`/manage`), dove puoi:
   - Configurare quante persone servono per ciascun giorno della settimana.
   - Aggiungere nuovi utenti, scegliendo il ruolo (`user` o `admin`).
   - Modificare i punteggi degli utenti.
   - Eseguire il backup e l'eventuale ripristino dei punteggi prima/dopo la generazione dei turni.
   - Generare e scaricare i turni del mese in formato Markdown.

## 9. Gestione quotidiana dei servizi

Comandi utili da eseguire nella cartella del progetto sulla VM:

- **Fermare i servizi** (senza cancellare i dati):
  ```bash
  docker compose down
  ```
- **Riavviare i servizi**:
  ```bash
  docker compose restart
  ```
- **Vedere lo stato dei container**:
  ```bash
  docker compose ps
  ```
- **Vedere i log del solo backend**:
  ```bash
  docker compose logs -f backend
  ```
- **Vedere i log del solo frontend**:
  ```bash
  docker compose logs -f frontend
  ```

## 10. Aggiornare l'applicazione

Quando pubblichi nuove modifiche sulla repository, per aggiornare la versione in esecuzione sulla VM:

```bash
cd <tuo-repository>
git pull
docker compose up --build -d
```

Il database (che vive nel volume persistente `./server/data`) non viene toccato da questa operazione: i dati degli utenti, dei punteggi e delle regole restano intatti.

## 11. Risoluzione problemi comuni

**La pagina resta bianca su rotte diverse dalla home (es. `/manage`)**
Verifica che la configurazione Nginx del frontend includa la direttiva `try_files $uri $uri/ /index.html;`, necessaria per il corretto funzionamento del routing lato client di React.

**Errore `SQLITE_READONLY: attempt to write a readonly database`**
Assicurati che la cartella dati del backend (es. `./server/data`) esista e abbia i permessi di scrittura corretti. Se necessario:
```bash
mkdir -p server/data
chmod 777 server/data
```

**Il container del backend si riavvia in loop (`exited with code 139`)**
Puo' capitare per incompatibilita' tra moduli nativi (es. `sqlite3`) e l'immagine `alpine` di Node. Verifica che il Dockerfile del backend usi un'immagine Node basata su Debian (es. `node:20`) invece di `node:20-alpine`, quindi ricostruisci senza cache:
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

**Non riesco a raggiungere l'IP pubblico sulla porta 8080/3001**
Controlla di aver aperto le porte sia sulla Security List della VCN (punto 3.1) sia sul firewall interno della VM con `iptables` o `ufw` (punto 3.2): entrambe le regole sono necessarie su Oracle Cloud.

**Ho perso i dati dopo un `docker compose up --build`**
Significa che il volume del database non e' mappato correttamente nel `docker-compose.yml`. Verifica che la sezione `volumes` del servizio backend punti a una cartella reale sull'host (es. `./server/data:/app/data`) e non a un percorso solo interno al container.