# CucinOne Cleaning Shifts

Una web application per la gestione e la generazione automatica dei turni di pulizia, comprensiva di sistema di punteggi, regole giornaliere personalizzabili, gestione degli utenti (Admin e User) e funzioni di backup e ripristino dei punteggi. 
Il progetto è completamente dockerizzato ed è composto da un Frontend in React e Vite e da un Backend in Node.js, Express e SQLite.

## Indice
1. [Prerequisiti](#prerequisiti)
2. [Configurazione del Server Cloud (es. Oracle Cloud)](#1-configurazione-del-server-cloud-es-oracle-cloud)
3. [Clonare e Configurare il Progetto](#2-clonare-e-configurare-il-progetto)
4. [Configurazione delle Variabili d'Ambiente (.env)](#3-configurazione-delle-variabili-dambiente-env)
5. [Avvio con Docker Compose](#4-avvio-con-docker-compose)
6. [Inizializzazione e Primo Avvio](#5-inizializzazione-e-primo-avvio)

## Prerequisiti
- Un server cloud (es. una VM su Oracle Cloud Infrastructure con Ubuntu).
- Docker e Docker Compose installati sulla macchina remota.
- Porte di rete aperte sui firewall del cloud (es. porta 8080 per il frontend e 3001 per il backend).

## 1. Configurazione del Server Cloud (es. Oracle Cloud)
1. Creare un'istanza compute su Ubuntu.
2. Aprire le porte necessarie nel pannello di rete (Security Lists / VCN):
   - Porta `8080` per l'accesso al frontend.
   - Porta `3001` per le chiamate API del backend.
3. Connettersi via SSH al server e installare Docker e Docker Compose:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install docker.io docker-compose-v2 -y
   sudo usermod -aG docker $USER

   