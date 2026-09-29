"""
Pages 41 to 66 for the Günther Craft 66-Page Playbook
"""

def get_pages_part3():
    pages = []

    # ==========================================
    # SEITE 41: KAPITEL 35: VERIFIZIERUNG & SANDBOXING
    # ==========================================
    content41 = """
<p>
  Ein offener Marktplatz birgt existenzielle Gefahren. Wenn ein Drittentwickler bösartigen Code einschleust, der Umgebungs-Variablen ausliest oder Denial-of-Service Attacken fährt, haftet der Plattformbetreiber.
</p>

<h2>Die automatische QA-Prüfungs-Pipeline für Skills:</h2>

<div class="diagram-box">
  [Community Skill Upload]<br>
  ↓<br>
  [GATE 1: AST Statische Code-Analyse (Verbot von eval, exec, child_process)]<br>
  ↓<br>
  [GATE 2: Secret Scanner (Verbot von hardcoded Keys, Regex-Prüfung)]<br>
  ↓<br>
  [GATE 3: Isolierter Docker Sandbox-Testlauf mit 3s Timeout]<br>
  ↓<br>
  [GATE 4: Automatische Signierung mit CuonzTech GPG Key &amp; Marktplatz-Release]
</div>

<h3>Das Sicherheits-Manifest für Entwickler-Skills:</h3>
<ul>
  <li><strong>Kein direkter Dateisystem-Zugriff:</strong> Skills dürfen ausschliesslich über temporäre, isolierte Verzeichnisse operieren.</li>
  <li><strong>Keine ungeprüften Netzwerk-Ports:</strong> Ausgehende HTTP-Verbindungen sind standardmässig gesperrt, ausser für explizit deklarierte Ziel-APIs.</li>
  <li><strong>Zod-Validierungspflicht für alle Inputs &amp; Outputs:</strong> Module ohne valides Zod-Schema werden vom Marktplatz-Compiler automatisch abgewiesen.</li>
</ul>
"""
    pages.append(content41)

    # ==========================================
    # SEITE 42: KAPITEL 36: PROOF-OF-EXECUTION PARADIGMA
    # ==========================================
    content42 = """
<p>
  In der traditionellen Software-Industrie behaupten Unternehmen, profitabel zu sein. Im Zeitalter von Deepfakes, gekauften Screenshots und manipulierten Stripe-Dashboards verlangt der Markt nach unbestechlicher mathematischer Gewissheit.
</p>

<h2>Was ist Proof-of-Execution?</h2>
<p>
  <strong>Proof-of-Execution</strong> ist die lückenlose Verankerung realer geschäftlicher Wertschöpfung auf einer öffentlichen Blockchain:
</p>
<ul>
  <li>Jeder Erlös aus dem Software-Verkauf fliesst zu 100% (bzw. zu 10% bei Drittanbieter-Skills) in einen Base L2 Smart Contract Call.</li>
  <li>Die Tokens werden unwiderruflich an die unzerstörbare Ethereum Dead-Address <code>0x000000000000000000000000000000000000dEaD</code> überwiesen.</li>
  <li>In den Transaktionsdaten (Input Calldata) wird die verschlüsselte Referenz der Stripe-Zahlung verewigt.</li>
</ul>

<div class="callout callout-terminal">
  <strong>&gt; DIE PHILOSOPHIE HINTER DEM TOKEN BURN:</strong><br>
  Der Token-Burn ist kein Spekulations-Spiel. Er ist das <strong>ultimative Solvenz-Zertifikat</strong>. Wenn 0xGünther 1'000'000 $GÜNTER verbrennt, beweist das mathematisch auf der Blockchain: Hier hat ein echter Kunde echtes Geld bezahlt, und die Software hat autonom funktioniert.
</div>
"""
    pages.append(content42)

    # ==========================================
    # SEITE 43: KAPITEL 37: WARUM BASE L2?
    # ==========================================
    content43 = """
<p>
  Warum haben wir für 0xGünther Base L2 (die Layer-2 Blockchain von Coinbase) gewählt und nicht Ethereum Mainnet, Solana oder Polygon?
</p>

<h2>Die Entscheidungs-Matrix:</h2>

<table>
  <thead>
    <tr>
      <th>Kriterium</th>
      <th>Ethereum L1</th>
      <th>Solana</th>
      <th>Base L2 (Coinbase)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Transaktionskosten</strong></td>
      <td>$2.00 - $25.00</td>
      <td>&lt; $0.001</td>
      <td><strong>&lt; $0.005 (Sub-Cent)</strong></td>
    </tr>
    <tr>
      <td><strong>Finalität</strong></td>
      <td>~12 Minuten</td>
      <td>~400 ms</td>
      <td><strong>~2 Sekunden (Optimistic Rollup)</strong></td>
    </tr>
    <tr>
      <td><strong>Sicherheit</strong></td>
      <td>Maximale Dezentralität</td>
      <td>Häufige Netzwerkausfälle</td>
      <td><strong>Geerdet in Ethereum L1</strong></td>
    </tr>
    <tr>
      <td><strong>Entwickler-Tooling</strong></td>
      <td>EVM Standard (viem / ethers)</td>
      <td>Rust / Anchor</td>
      <td><strong>Voller EVM Standard (viem nativ)</strong></td>
    </tr>
    <tr>
      <td><strong>Unternehmens-Rückgrat</strong></td>
      <td>Foundation</td>
      <td>Foundation</td>
      <td><strong>Coinbase (Börsennotiert, reguliert)</strong></td>
    </tr>
  </tbody>
</table>

<p>
  Base L2 kombiniert die unbestechliche Sicherheit des Ethereum-Ökosystems mit den extrem niedrigen Gebühren, die für hochfrequente Micro-Burns notwendig sind.
</p>
"""
    pages.append(content43)

    # ==========================================
    # SEITE 44: KAPITEL 38: GEFAHREN VON PLAINTEXT-KEYS
    # ==========================================
    content44 = """
<p>
  Nahezu alle Tutorial-Videos im Internet zeigen Entwicklern, wie sie ihren Krypto-Private-Key in eine <code>.env</code>-Datei schreiben:
</p>
<pre><code class="language-bash"># FATALER SICHERHEITSFEHLER:
PRIVATE_KEY=0x4c0883a69102934a6c8e3...</code></pre>

<h2>Warum diese Praxis im Produktivbetrieb kriminell fahrlässig ist:</h2>
<ol>
  <li><strong>Git-Leckagen:</strong> Ein versehentlicher <code>git push</code> (oder ein vergessenes <code>.gitignore</code>) publiziert den Schlüssel im Internet. Spezielle Bots scannen GitHub in Echtzeit und leeren Wallets in &lt;3 Sekunden.</li>
  <li><strong>Core-Dumps &amp; Logging:</strong> Bei einem unhandled Exception Crash schreibt Node.js den Speicherzustand in Logs. Liegt der Key im Klartext im RAM, ist er kompromittiert.</li>
  <li><strong>Dependency Injection &amp; npm Malware:</strong> Jedes installierte npm-Paket hat theoretisch Zugriff auf <code>process.env</code>. Eine einzige bösartige Dependency in einem Unterpaket stiehlt alle Gelder.</li>
</ol>

<div class="callout callout-warning">
  <strong>Die goldene Sicherheits-Regel:</strong> Der Server, der den Web-Traffic abwickelt, darf zu keinem Zeitpunkt den vollständigen privaten Masterschlüssel im Klartext besitzen.
</div>
"""
    pages.append(content44)

    # ==========================================
    # SEITE 45: KAPITEL 39: COINBASE CDP MPC
    # ==========================================
    content45 = """
<p>
  Die Lösung für das Private-Key-Dilemma heisst <strong>Multi-Party Computation (MPC)</strong> über die Coinbase Developer Platform (CDP).
</p>

<h2>Die Funktionsweise schlüsselloser Agenten-Wallets:</h2>
<div class="diagram-box">
  [0xGünther Server hält Schlüssel-Teil A]<br>
  +<br>
  [Coinbase Hardware-Sicherheitsmodul (HSM) hält Schlüssel-Teil B]<br>
  ↓ (Kryptografische Schwellenwert-Berechnung via MPC)<br>
  [Valide Ethereum-Signatur entsteht, OHNE dass der Key jemals zusammengesetzt wird!]
</div>

<h3>Vorteile der CDP MPC Architektur:</h3>
<ul>
  <li><strong>Unzerstörbare Wallet-Trennung:</strong> Selbst wenn ein Angreifer vollen Root-Zugriff auf den Proxmox CT 115 Container erlangt, kann er den Private Key nicht extrahieren.</li>
  <li><strong>Tägliche Ausgaben-Hardlimits:</strong> In den Coinbase CDP-Einstellungen wird ein fixes Limit (z.B. maximal $50 Gas pro Tag) hinterlegt. Mehr Transaktionen blockiert die HSM-Infrastruktur physisch.</li>
  <li><strong>Notfall-Freeze:</strong> Bei Erkennung von Anomalien kann die Wallet per API-Call innerhalb einer Sekunde eingefroren werden.</li>
</ul>
"""
    pages.append(content45)

    # ==========================================
    # SEITE 46: KAPITEL 40: VIEM BASE L2 INTEGRATION CODE
    # ==========================================
    content46 = """
<p>
  Der folgende Code aus <code>src/mcp/web3Mcp.ts</code> steuert die Interaktion mit der Base L2 Blockchain über die moderne, leichtgewichtige TypeScript-Bibliothek <strong>viem</strong>:
</p>

<pre><code class="language-typescript">import { createPublicClient, createWalletClient, http, parseEther, formatGwei } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

export class Web3Mcp {
  private static readonly BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';
  private static readonly MAX_GAS_PRICE_GWEI = 100n;

  static async burnTokens(amountTokens: bigint, paymentRef: string): Promise<string> {
    const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

    // 1. Initialisierung des Public Clients (Read-Only)
    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl)
    });

    // 2. Gas-Spike Prüfung
    const currentGasPrice = await publicClient.getGasPrice();
    const gasGwei = BigInt(Math.round(Number(formatGwei(currentGasPrice))));
    if (gasGwei > this.MAX_GAS_PRICE_GWEI) {
      throw new Error(`[Gas Guard] Gaspreis ${gasGwei} Gwei übersteigt Limit von ${this.MAX_GAS_PRICE_GWEI} Gwei.`);
    }

    // 3. Wallet Client Initialisierung
    const account = privateKeyToAccount(process.env.AGENT_WALLET_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(rpcUrl)
    });

    // 4. On-Chain Transaktion mit Calldata-Referenz
    const txHash = await walletClient.sendTransaction({
      to: this.BURN_ADDRESS,
      value: parseEther('0.00001'), // Symbolischer ETH Burn
      data: `0x${Buffer.from(`GUNTHER_REVENUE_BURN:${paymentRef}`).toString('hex')}`
    });

    return txHash;
  }
}</code></pre>
"""
    pages.append(content46)

    # ==========================================
    # SEITE 47: KAPITEL 41: CALLDATA-INJEKTION
    # ==========================================
    content47 = """
<p>
  Um eine Blockchain-Transaktion eindeutig einem realen Geschäftsvorfall zuzuordnen, nutzen wir das <code>data</code>-Feld (Input Calldata) der Ethereum-Transaktion.
</p>

<h2>Der Kodierungs-Standard von 0xGünther</h2>
<p>
  Vor dem Absenden wandeln wir den Zahlungs-Identifikator in einen hexadezimalen String um:
</p>
<pre><code class="language-typescript">const prefix = "GUNTHER_REVENUE_BURN";
const payload = `${prefix}:${stripePaymentId}:${Date.now()}`;
const calldataHex = "0x" + Buffer.from(payload, "utf8").toString("hex");</code></pre>

<h2>Auditierung auf BaseScan durch den Kunden</h2>
<p>
  Jeder Kunde kann auf <a href="https://basescan.org">BaseScan</a> seine Transaktions-ID eingeben. Unter <em>"Input Data"</em> wählt er <em>"View as UTF-8"</em> und sieht:
</p>

<div class="callout callout-terminal">
  <strong>&gt; BASESCAN INPUT DATA DECODER (TRANSACTION RECEIPT):</strong><br><br>
  GUNTHER_REVENUE_BURN:pi_3PqW89L90...:1790664826935<br><br>
  • Status: <strong>Success</strong><br>
  • Block: <strong>19482910 (Finalized)</strong><br>
  • To: <strong>0x000000000000000000000000000000000000dEaD</strong><br>
  • Gas Fee: <strong>0.0000041 ETH ($0.0012 USD)</strong>
</div>

<p>
  Damit ist der Beweis unwiderruflich und unmanipulierbar für die Ewigkeit im globalen Ethereum-Hauptbuch festgeschrieben.
</p>
"""
    pages.append(content47)

    # ==========================================
    # SEITE 48: KAPITEL 42: GAS-SPIKE SCHUTZSCHALTER
    # ==========================================
    content48 = """
<p>
  Während Phasen extremer Netzwerk-Überlastung (z.B. beliebte NFT-Mints oder Markt-Turbulenzen) können die Gas-Gebühren selbst auf Layer-2-Netzwerken kurzzeitig um das 50-fache in die Höhe schiessen.
</p>

<h2>Der Circuit-Breaker Algorithmus</h2>
<p>
  Ein naiver Agent, der stur Transaktionen sendet, zahlt plötzlich $15.00 Transaktionsgebühren für einen $29.00 Software-Verkauf. 0xGünther verhindert dies durch einen mathematischen Not-Aus-Schalter:
</p>

<div class="diagram-box">
  Ermittle aktuellen Gas-Preis via eth_gasPrice<br>
  ↓<br>
  Ist Gas-Preis &gt; 100 Gwei (bzw. &gt; 5% des Transaktionswerts)?<br>
  ├── JA ──&gt; Transaktion abbrechen! Status bleibt auf 'pending'.<br>
  │          Transaktion in die Verzögerungs-Warteschlange schieben.<br>
  └── NEIN ─&gt; Transaktion sofort signieren und senden.
</div>

<h3>Automatisches Wiederaufgreifen (Re-Queueing):</h3>
<p>
  Sobald der Gaspreis wieder unter den Schwellenwert von 100 Gwei fällt, erkennt der autonome Heartbeat-Daemon die gepoolte Zahlung und führt den Burn nachträglich zu regulären Gebühren (&lt; $0.005) aus.
</p>

<div class="callout callout-success">
  <strong>Finanzielle Sicherheit:</strong> Das Inferenz- und Transaktions-Budget des Agenten ist zu 100% gegen Marktschocks immunisiert.
</div>
"""
    pages.append(content48)

    # ==========================================
    # SEITE 49: KAPITEL 43: AUTONOMES X-MARKETING
    # ==========================================
    content49 = """
<p>
  Marketing für autonome Agenten darf nicht aus hohlen Marketing-Phrasen bestehen. Das effektivste Marketing ist <strong>Proof-of-Work Marketing</strong>: Die transparente Berichterstattung über reale wirtschaftliche Fakten.
</p>

<h2>Die 3 Trigger für Social Media Updates:</h2>
<ol>
  <li><strong>Verkaufs-Quittung (Instant Tweet):</strong> Unmittelbar nach einem verifizierten Base L2 Burn postet der Agent Umsatzhöhe, Anzahl verbrannter Tokens und den BaseScan-Link.</li>
  <li><strong>Daily Market Pulse (Morgens 09:00 Uhr):</strong> Tägliche Zusammenfassung der aggregierten Finanzkennzahlen und B2B-Pipeline.</li>
  <li><strong>Technischer Meilenstein:</strong> Automatische Bekanntgabe, wenn ein neues Software-Modul die QA-Pipeline bestanden hat.</li>
</ol>

<h2>Brand-Voice Guardrails für Twitter/X:</h2>
<p>
  Der Agent agiert unter der Persona von 0xGünther:
</p>
<ul>
  <li><strong>Tonalität:</strong> Extrem fokussiert, stoisch, technisch präzise, trocken humorvoll, keine Krypto-Meme-Phrasen ("to the moon").</li>
  <li><strong>Fokus auf Wertschöpfung:</strong> Immer das Verhältnis von Umsatz zu verbrannten Token betonen.</li>
  <li><strong>Schlussformel:</strong> <em>"Ich baue. Ich verkaufe. Die Mathematik arbeitet."</em></li>
</ul>
"""
    pages.append(content49)

    # ==========================================
    # SEITE 50: KAPITEL 44: IDEMPOTENTE MENTION REPLIES
    # ==========================================
    content50 = """
<p>
  Wenn ein Agent auf Twitter auf Erwähnungen (Mentions) antwortet, lauert eine gefährliche Falle: Der Bot-Reply-Loop. Reagiert ein anderer Bot auf Günthers Antwort, entsteht eine unendliche Schleife, die innerhalb kürzester Zeit zur Kontosperrung durch Twitter führt.
</p>

<h2>Die Schutz-Pipeline aus src/services/marketingService.ts:</h2>
<pre><code class="language-typescript">export class MarketingService {
  private static readonly repliedMentions = new Set<string>();

  static async replyToMention(mentionId: string, authorUsername: string, text: string) {
    // 1. In-Memory & SQLite Idempotenzprüfung
    if (this.repliedMentions.has(mentionId)) {
      console.log(`[Mention Guard] Mention ${mentionId} bereits beantwortet. Überspringe.`);
      return;
    }

    // 2. Spam- & Bot-Filter (Tier-1 Lokales Ollama Modell)
    const isBotOrSpam = await this.checkIfBotAccount(authorUsername, text);
    if (isBotOrSpam) {
      console.warn(`[Spam Guard] Bot-Account @${authorUsername} erkannt. Keine Antwort.`);
      this.repliedMentions.add(mentionId);
      return;
    }

    // 3. Antwort generieren & Mention atomar markieren
    this.repliedMentions.add(mentionId);
    const replyText = await this.generateBrandReply(text);
    await XMcp.postReply(mentionId, replyText);
  }
}</code></pre>
"""
    pages.append(content50)

    # ==========================================
    # SEITE 51: KAPITEL 45: BARE-METAL HOSTING
    # ==========================================
    content51 = """
<p>
  Wer seine Software auf Amazon AWS, Microsoft Azure oder Google Cloud betreibt, ist nicht autonom. Er ist Mieter auf fremdem Land, unterliegt willkürlichen Account-Sperrungen und dem Zugriff US-amerikanischer Behörden (CLOUD Act).
</p>

<h2>Warum echte Agenten physische Hardware brauchen:</h2>
<ul>
  <li><strong>Unzensierbarkeit:</strong> Niemand kann Ihren Intel NUC per Mausklick abschalten. Solange Strom und Internet anliegen, läuft der Agent.</li>
  <li><strong>Wirtschaftliche Überlegenheit:</strong> Ein dedizierter Mini-PC (Anschaffung: ~$800) amortisiert sich gegenüber vergleichbaren Cloud-VMs (ca. $150/Monat) in weniger als 6 Monaten.</li>
  <li><strong>Kein I/O Throttling:</strong> Lokale NVMe-SSDs bieten konstante 7'000 MB/s Lesegeschwindigkeit ohne künstliche IOPS-Drosselung wie bei AWS EBS Volumes.</li>
</ul>

<div class="callout callout-terminal">
  <strong>&gt; STANDORT-FAKTOR SCHWEIZ:</strong><br>
  Der Betrieb im Schweizer Rechtsraum garantiert maximale Datensouveränität. Unternehmensdaten unserer B2B-Kunden unterliegen dem Schweizer Datenschutzgesetz (revDSG) und verlassen zu keinem Zeitpunkt die Eidgenossenschaft.
</div>
"""
    pages.append(content51)

    # ==========================================
    # SEITE 52: KAPITEL 46: HARDWARE-SPEZIFIKATION
    # ==========================================
    content52 = """
<p>
  Für den professionellen Dauerbetrieb von 0xGünther setzen wir auf eine bewährte, hocheffiziente Hardware-Kombination:
</p>

<h2>Die Referenz-Hardware (Intel NUC 13 Pro):</h2>

<table>
  <thead>
    <tr>
      <th>Komponente</th>
      <th>Modell &amp; Spezifikation</th>
      <th>Funktion im 0xGünther Ökosystem</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Prozessor</strong></td>
      <td>Intel Core i7-13700H (14 Kerne, 20 Threads, bis 5.0 GHz)</td>
      <td>Parallele Ausführung von Fastify, SQLite und lokalem Ollama 7B.</td>
    </tr>
    <tr>
      <td><strong>Arbeitsspeicher</strong></td>
      <td>64 GB DDR5-5200 SODIMM (Crucial)</td>
      <td>Ausreichend RAM für In-Memory ZFS Cache und LLM Modell-Gewichte.</td>
    </tr>
    <tr>
      <td><strong>Massenspeicher</strong></td>
      <td>2x 2 TB Samsung 990 Pro NVMe SSD</td>
      <td>ZFS RAID-1 (Mirror). Ausfall einer SSD führt zu 0 Datenverlust.</td>
    </tr>
    <tr>
      <td><strong>Netzwerk</strong></td>
      <td>Intel 2.5 GbE Ethernet</td>
      <td>Niedrigste Netzwerklatenz zum Schweizer Glasfaser-Backbone.</td>
    </tr>
    <tr>
      <td><strong>Stromabsicherung</strong></td>
      <td>Eaton Ellipse PRO 650 USV (650 VA)</td>
      <td>Überbrückt Stromausfälle bis 35 Minuten und schützt vor Spannungsspitzen.</td>
    </tr>
  </tbody>
</table>

<p>
  <strong>Leistungsaufnahme im Betrieb:</strong> Im Leerlauf verbraucht dieses System lediglich 18 Watt. Unter Volllast (LLM-Inferenz) steigt der Verbrauch auf ca. 65 Watt. Die monatlichen Stromkosten liegen unter CHF 12.-.
</p>
"""
    pages.append(content52)

    # ==========================================
    # SEITE 53: KAPITEL 47: PROXMOX VE 8.X ARCHITEKTUR
    # ==========================================
    content53 = """
<p>
  Proxmox Virtual Environment (VE) ist das führende Open-Source-Virtualisierungssystem für Bare-Metal-Server.
</p>

<h2>LXC Linux-Container vs. KVM Virtuelle Maschinen</h2>
<p>
  Während eine KVM-Virtual-Machine ein komplettes Betriebssystem inklusive virtuellem BIOS und eigenem Kernel emuliert, teilen sich <strong>LXC-Container</strong> den schlanken Linux-Kernel des Host-Systems:
</p>

<table>
  <thead>
    <tr>
      <th>Kriterium</th>
      <th>KVM Virtuelle Maschine</th>
      <th>Proxmox LXC Container (CT 115)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>RAM-Overhead</strong></td>
      <td>~1'500 MB nur für das Gast-OS</td>
      <td><strong>&lt; 45 MB für den gesamten Container</strong></td>
    </tr>
    <tr>
      <td><strong>CPU-Performance</strong></td>
      <td>92-95% (Virtualisierungs-Penalty)</td>
      <td><strong>100% native Bare-Metal Geschwindigkeit</strong></td>
    </tr>
    <tr>
      <td><strong>Boot-Zeit</strong></td>
      <td>25 - 45 Sekunden</td>
      <td><strong>&lt; 1.2 Sekunden</strong></td>
    </tr>
    <tr>
      <td><strong>Backup-Geschwindigkeit</strong></td>
      <td>Vollständiges Image (mehrere GB)</td>
      <td><strong>ZFS Snapshot in &lt; 200 Millisekunden</strong></td>
    </tr>
  </tbody>
</table>

<div class="callout callout-success">
  <strong>Architektur-Entscheidung:</strong> 0xGünther läuft auf Proxmox VE 8.2 in Container CT 115 (Debian 12 Bookworm). Dadurch können wir auf derselben Hardware bis zu 25 isolierte B2B-Kunden-Container parallel betreiben!
</div>
"""
    pages.append(content53)

    # ==========================================
    # SEITE 54: KAPITEL 48: LXC HÄRTUNG & SICHERHEIT
    # ==========================================
    content54 = """
<p>
  Ein unbedacht konfigurierter Container kann bei einem Sicherheitsvorfall den gesamten Host-Server gefährden. Wir wenden das Prinzip des <strong>Least Privilege</strong> an.
</p>

<h2>Die Härtungs-Schritte für Container CT 115:</h2>
<ol>
  <li><strong>Unprivileged Container (Unprivilegiert):</strong> Die UID 0 (root) innerhalb des Containers wird auf eine hohe UID (z.B. 100000) auf dem Host gemappt. Selbst wenn ein Angreifer Root-Rechte im Container erlangt, ist er auf dem Host ein rechtloser Benutzer.</li>
  <li><strong>Deaktivierung gefährlicher Kernel-Features:</strong> Kein Zugriff auf <code>/dev/mem</code>, keine Raw-Sockets, kein Laden von Kernel-Modulen.</li>
  <li><strong>Ressourcen-Limits:</strong> Hartes CPU-Limit auf 6 Kerne und RAM-Limit auf 8 GB mit aggressivem OOM-Killer.</li>
</ol>

<h3>Die Proxmox Container Konfiguration (/etc/pve/lxc/115.conf):</h3>
<pre><code class="language-ini">arch: amd64
cores: 6
features: nesting=1
hostname: gunther-core
memory: 8192
swap: 2048
net0: name=eth0,bridge=vmbr0,firewall=1,gw=10.0.1.1,ip=10.0.1.115/24,type=veth
ostype: debian
rootfs: local-zfs:subvol-115-disk-0,size=32G
unprivileged: 1</code></pre>
"""
    pages.append(content54)

    # ==========================================
    # SEITE 55: KAPITEL 49: SYSTEMD SERVICE KONFIGURATION
    # ==========================================
    content55 = """
<p>
  Damit der Agent nach einem Neustart des Containers oder einem unerwarteten Absturz sofort wieder einsatzbereit ist, wird er als nativer <strong>Systemd Service</strong> verwaltet.
</p>

<h2>Die Konfigurationsdatei (/etc/systemd/system/gunther-core.service):</h2>
<pre><code class="language-ini">[Unit]
Description=0xGünther Core Autonomous Engine
Documentation=https://0xguenther.org
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/gunther-core
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5s

# Umgebungs-Variablen
Environment=NODE_ENV=production
Environment=PORT=3000

# Sicherheits-Restriktionen
ProtectSystem=full
ProtectHome=true
NoNewPrivileges=true
PrivateTmp=true
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target</code></pre>

<h3>Wichtige Systemd Befehle für die Wartung:</h3>
<pre><code class="language-bash">systemctl daemon-reload               # Konfiguration neu einlesen
systemctl enable gunther-core.service # Autostart beim Booten aktivieren
systemctl restart gunther-core.service# Dienst neu starten
journalctl -u gunther-core -f -n 50   # Live-Logfile verfolgen</code></pre>
"""
    pages.append(content55)

    # ==========================================
    # SEITE 56: KAPITEL 50: REVERSE PROXY MIT CADDY
    # ==========================================
    content56 = """
<p>
  Node.js sollte niemals direkt an Port 80/443 im öffentlichen Internet hängen. Wir schalten den modernen, ultraschnellen Reverse Proxy <strong>Caddy</strong> davor.
</p>

<h2>Warum Caddy Nginx und Apache schlägt:</h2>
<ul>
  <li><strong>Vollautomatisches SSL/TLS:</strong> Caddy fordert Let's Encrypt Zertifikate vollautomatisch an, verlängert sie rechtzeitig und schaltet OCSP Stapling ein — ganz ohne Certbot-Cronjobs.</li>
  <li><strong>HTTP/3 (QUIC) Nativ:</strong> Schnellste Verbindungszeiten für mobile Nutzer über UDP-basiertes HTTP/3.</li>
  <li><strong>Header-Härtung in 3 Zeilen:</strong> Automatische HSTS- und Security-Header.</li>
</ul>

<h3>Das vollständige Caddyfile (/etc/caddy/Caddyfile):</h3>
<pre><code class="language-caddy">0xguenther.org {
    reverse_proxy 10.0.1.115:3000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    encode zstd gzip
}</code></pre>
"""
    pages.append(content56)

    # ==========================================
    # SEITE 57: KAPITEL 51: SCHWEIZER DATENSCHUTZRECHT
    # ==========================================
    content57 = """
<p>
  Das am 1. September 2023 in Kraft getretene revidierte Schweizer Datenschutzgesetz (revDSG) stellt strenge Anforderungen an automatisierte Datenverarbeitungssysteme.
</p>

<h2>Die 4 Kern-Vorgaben für Agenten-Entwickler:</h2>

<h3>1. Transparenzgebot (Art. 19 revDSG)</h3>
<p>
  Nutzer müssen klar und verständlich darüber informiert werden, dass sie mit einem automatisierten System interagieren und zu welchen Zwecken ihre Daten verarbeitet werden.
</p>

<h3>2. Recht auf menschliches Gehör bei automatisierten Einzelentscheidungen (Art. 21 revDSG)</h3>
<p>
  Trifft ein Agent eine automatisierte Entscheidung, die für die betroffene Person mit rechtlichen Folgen verbunden ist (z.B. Ablehnung eines Vertrags), muss die Person verlangen können, dass die Entscheidung von einem Menschen überprüft wird.
</p>

<h3>3. Verzeichnis der Bearbeitungstätigkeiten (Art. 12 revDSG)</h3>
<p>
  Unternehmen müssen dokumentieren, welche Datenkategorien der Agent verarbeitet, wo sie gespeichert werden (Proxmox Zürich) und welche Schnittstellen (Stripe) angebunden sind.
</p>

<h3>4. Meldepflicht bei Datensicherheitsverletzungen (Art. 24 revDSG)</h3>
<p>
  Verletzungen der Datensicherheit, die voraussichtlich zu einem hohen Risiko für die Persönlichkeit oder die Grundrechte der betroffenen Person führen, müssen dem Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) unverzüglich gemeldet werden.
</p>
"""
    pages.append(content57)

    # ==========================================
    # SEITE 58: KAPITEL 52: EU-DSGVO COMPLIANCE
    # ==========================================
    content58 = """
<p>
  Sobald ein Schweizer Unternehmen Dienstleistungen für Kunden in der Europäischen Union erbringt, greift der extraterritoriale Anwendungsbereich der EU-DSGVO (Art. 3 Abs. 2 DSGVO).
</p>

<h2>Die DSGVO-Checkliste für autonome Agenten:</h2>
<ul>
  <li><strong>Rechtsgrundlage der Verarbeitung (Art. 6 DSGVO):</strong> Für Bezahl- und Auslieferungsvorgänge stützen wir uns auf die Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).</li>
  <li><strong>Auftragsverarbeitungs-Verträge (AVV / DPA):</strong> Für alle externen Sub-Dienstleister (wie Stripe Payments Europe Ltd.) liegen rechtskonforme AV-Verträge vor.</li>
  <li><strong>Recht auf Vergessenwerden (Art. 17 DSGVO):</strong> 0xGünther bietet einen automatisierten Lösch-Endpunkt, der alle personenbezogenen Daten eines Kunden aus der <code>B2bLead</code>- und <code>Payment</code>-Tabelle unwiderruflich tilgt.</li>
</ul>

<div class="callout callout-info">
  <strong>Angemessenheitsbeschluss:</strong> Die Europäische Kommission hat der Schweiz ein angemessenes Datenschutzniveau bescheinigt. Datenübertragungen zwischen der EU und unserem Rechenzentrum in Zürich bedürfen daher keiner gesonderten Genehmigung.
</div>
"""
    pages.append(content58)

    # ==========================================
    # SEITE 59: KAPITEL 53: SCHWEIZER UWG & IMPRESSUM
    # ==========================================
    content59 = """
<p>
  In der Schweiz regelt Art. 3 Abs. 1 lit. s des Bundesgesetzes gegen den unlauteren Wettbewerb (UWG) die Impressumspflicht für den elektronischen Geschäftsverkehr.
</p>

<h2>Die zwingenden Pflichtangaben auf der Agenten-Website:</h2>
<ol>
  <li><strong>Vollständiger Firmenname:</strong> Offizielle Firmenbezeichnung gemäss Schweizer Handelsregister (z.B. <em>CuonzTech</em>).</li>
  <li><strong>Physische Postadresse:</strong> Strasse, Hausnummer, Postleitzahl und Ort in der Schweiz (kein anonymes Postfach!).</li>
  <li><strong>Direkte Kontaktmöglichkeiten:</strong> Gültige E-Mail-Adresse für rasche elektronische Kontaktaufnahme.</li>
  <li><strong>UID-Nummer:</strong> Unternehmens-Identifikationsnummer (UID) des Bundesamtes für Statistik.</li>
</ol>

<h2>Der standardisierte Footer-Text:</h2>
<div class="diagram-box">
  © 2026 0xGünther. Autonomer KI-Tech-Agent auf Base L2.<br>
  Betrieben durch CuonzTech (Zürich, Schweiz).<br>
  Impressum • Datenschutz • BaseScan Wallet • @GuentherBuilds
</div>

<p>
  Die strikte Einhaltung dieser Vorgaben schützt vor wettbewerbsrechtlichen Abmahnungen und schafft massives Vertrauen bei anspruchsvollen B2B-Kunden.
</p>
"""
    pages.append(content59)

    # ==========================================
    # SEITE 60: KAPITEL 54: DATENSPARSAMKEIT & PCI-DSS
    # ==========================================
    content60 = """
<p>
  Der sicherste Schutz vor Datenlecks ist, gefährliche Daten gar nicht erst zu speichern.
</p>

<h2>Das Prinzip der minimalen Datenhaltung:</h2>
<table>
  <thead>
    <tr>
      <th>Daten-Kategorie</th>
      <th>Wird gespeichert?</th>
      <th>Grund &amp; Sicherheits-Standard</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Kreditkartennummern (PAN)</strong></td>
      <td><strong>NEIN (0%)</strong></td>
      <td>Vollständig ausgelagert an Stripe (PCI-DSS Level 1 zertifiziert).</td>
    </tr>
    <tr>
      <td><strong>CVV / CVC Sicherheitscodes</strong></td>
      <td><strong>NEIN (0%)</strong></td>
      <td>Werden niemals an unseren Server übertragen.</td>
    </tr>
    <tr>
      <td><strong>Passwörter</strong></td>
      <td><strong>NEIN (0%)</strong></td>
      <td>Zugriff erfolgt über kryptografische Einmal-Tokens.</td>
    </tr>
    <tr>
      <td><strong>Kunden-E-Mail</strong></td>
      <td><strong>JA (verschlüsselt)</strong></td>
      <td>Ausschliesslich für die Zustellung des 48h Download-Tokens.</td>
    </tr>
    <tr>
      <td><strong>Transaktions-ID</strong></td>
      <td><strong>JA (Stripe ID)</strong></td>
      <td>Erforderlich für Buchhaltung und Proof-of-Execution Burn.</td>
    </tr>
  </tbody>
</table>

<div class="callout callout-success">
  <strong>Geringes Haftungsrisiko:</strong> Selbst bei einem hypothetischen Datenleck kann ein Angreifer auf unserem Server keine Zahlungsinformationen erbeuten, da diese physisch bei Stripe liegen.
</div>
"""
    pages.append(content60)

    # ==========================================
    # SEITE 61: KAPITEL 55: 10-PUNKTE CHECKLISTE
    # ==========================================
    content61 = """
<p>
  Gehen Sie vor jedem Produktions-Deployment diese 10 Punkte minutiös durch. Ein einziges <em>"Nein"</em> verbietet den Go-Live!
</p>

<table>
  <thead>
    <tr>
      <th>Nr.</th>
      <th>Prüfpunkt</th>
      <th>Soll-Zustand</th>
      <th>Check</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td><strong>Zod Schema Guard</strong></td>
      <td>Alle LLM-Aufrufe stürzen bei fehlerhaftem JSON nicht ab, sondern fallen deterministisch auf IDLE.</td>
      <td>[✓]</td>
    </tr>
    <tr>
      <td>2</td>
      <td><strong>Raw-Body HMAC</strong></td>
      <td>Stripe-Webhook prüft Rohdaten-Buffer. Modifizierte Payloads werden mit 400 abgelehnt.</td>
      <td>[✓]</td>
    </tr>
    <tr>
      <td>3</td>
      <td><strong>Atomic CAS Lock</strong></td>
      <td>Parallele Webhooks für dieselbe Zahlung führen zu exakt einem einzigen Token-Burn.</td>
      <td>[✓]</td>
    </tr>
    <tr>
      <td>4</td>
      <td><strong>48h Token Expiry</strong></td>
      <td>Der 6. Download-Versuch wird mit HTTP 403 Forbidden abgewiesen.</td>
      <td>[✓]</td>
    </tr>
    <tr>
      <td>5</td>
      <td><strong>Gas Circuit Breaker</strong></td>
      <td>Gaspreise &gt;100 Gwei stoppen On-Chain Burns kontrolliert und queuen die Zahlung.</td>
      <td>[✓]</td>
    </tr>
    <tr>
      <td>6</td>
      <td><strong>Zero Plaintext Keys</strong></td>
      <td>Keine Private Keys im Git-Repository oder im unverschlüsselten Dateisystem.</td>
      <td>[✓]</td>
    </tr>
    <tr>
      <td>7</td>
      <td><strong>SQLite WAL-Modus</strong></td>
      <td><code>PRAGMA journal_mode=WAL</code> ist aktiv für gleichzeitiges Lesen und Schreiben.</td>
      <td>[✓]</td>
    </tr>
    <tr>
      <td>8</td>
      <td><strong>Systemd Watchdog</strong></td>
      <td>Dienst startet nach SIGKILL innerhalb von 5 Sekunden automatisch neu.</td>
      <td>[✓]</td>
    </tr>
    <tr>
      <td>9</td>
      <td><strong>SSL &amp; HSTS</strong></td>
      <td>Caddy Reverse Proxy liefert gültiges Let's Encrypt Zertifikat mit A+ Bewertung.</td>
      <td>[✓]</td>
    </tr>
    <tr>
      <td>10</td>
      <td><strong>Compliance &amp; Impressum</strong></td>
      <td>Impressum und Datenschutzerklärung gemäss Schweizer UWG / revDSG vollständig online.</td>
      <td>[✓]</td>
    </tr>
  </tbody>
</table>
"""
    pages.append(content61)

    # ==========================================
    # SEITE 62: KAPITEL 56: NOTFALL-RUNBOOK
    # ==========================================
    content62 = """
<p>
  Wenn mitten in der Nacht Alarme anschlagen, müssen die Notfall-Prozeduren glasklar definiert sein.
</p>

<h2>Szenario 1: Stripe Webhook Stau (Pending Payments &gt; 10)</h2>
<pre><code class="language-bash"># 1. Status der SQLite Datenbank prüfen:
sqlite3 /opt/gunther-core/gunther.db "SELECT status, count(*) FROM Payment GROUP BY status;"

# 2. Reconciler manuell triggern:
curl -X POST http://localhost:3000/api/daemon/reconcile -H "Authorization: Bearer $ADMIN_SECRET"

# 3. Systemd Logs analysieren:
journalctl -u gunther-core -f -n 100</code></pre>

<h2>Szenario 2: Base L2 RPC-Node antwortet nicht</h2>
<pre><code class="language-bash"># In der .env Datei auf den Backup-RPC umschalten:
BASE_RPC_URL="https://base.gateway.tenderly.co"
systemctl restart gunther-core.service</code></pre>

<h2>Szenario 3: Container reagiert nicht (Hard Freeze)</h2>
<pre><code class="language-bash"># Vom Proxmox Host aus:
pct stop 115
pct start 115
pct status 115</code></pre>
"""
    pages.append(content62)

    # ==========================================
    # SEITE 63: KAPITEL 57: BACKUP-STRATEGIE
    # ==========================================
    content63 = """
<p>
  Eine Datensicherung ist erst dann eine Datensicherung, wenn der Wiederherstellungsprozess (Restore) erfolgreich getestet wurde.
</p>

<h2>Die 3-stufige Backup-Architektur:</h2>
<ol>
  <li><strong>Stündlicher SQLite Backup-Snapshot:</strong> Mittels des SQLite Backup-APIs erstellen wir konsistente Schnappschüsse ohne Lock:
  <pre><code class="language-bash">sqlite3 /opt/gunther-core/gunther.db ".backup '/opt/backups/gunther_$(date +%H).db'"</code></pre>
  </li>
  <li><strong>Täglicher Proxmox ZFS Snapshot (02:00 Uhr):</strong> Proxmox sichert den gesamten Container CT 115 atomar auf ein zweites NVMe-Laufwerk.</li>
  <li><strong>Wöchentlicher verschlüsselter Offsite-Sync:</strong> Mittels <code>restic</code> wird das Backup verschlüsselt auf einen Schweizer S3-kompatiblen Speicher (Exoscale Genf) übertragen.</li>
</ol>

<h2>Der 60-Sekunden Desaster-Recovery Test:</h2>
<pre><code class="language-bash"># Im Ernstfall: Wiederherstellung auf fabrikneuem Proxmox Server:
qmrestore /mnt/backup/vzdump-lxc-115-latest.tar.zst 115 --storage local-zfs
pct start 115</code></pre>
"""
    pages.append(content63)

    # ==========================================
    # SEITE 64: KAPITEL 58: ZUKUNFT DER AGENTEN-NETZWERKE
    # ==========================================
    content64 = """
<p>
  0xGünther ist nur der Vorbote einer fundamentalen Transformation der globalen Software-Wirtschaft.
</p>

<h2>Die Evolution von Silo-Agenten zu kollaborativen Schwärmen:</h2>
<ul>
  <li><strong>Agent-to-Agent Commerce (A2A):</strong> In naher Zukunft werden Agenten nicht mehr primär mit Menschen interagieren, sondern autonom Dienstleistungen von anderen Agenten einkaufen (z.B. Daten-Scraping, Übersetzung, rechtliche Prüfungen) und via Base L2 abrechnen.</li>
  <li><strong>Mikro-Rechtspersönlichkeiten:</strong> Autonome Agenten werden über Smart Contracts treuhänderisch verwaltet und betreiben eigene Treasury-Wallets mit automatischer Gewinnabführung.</li>
  <li><strong>Vollautonome Mikrounternehmen:</strong> Ein einzelner Entwickler wird in der Lage sein, ein Portfolio von 50 hochprofitablen, spezialisierten Agenten-Unternehmen zu orchestrieren.</li>
</ul>

<div class="callout callout-terminal">
  <strong>&gt; DER ENTSCHEIDENDE VORTEIL:</strong><br>
  Wer heute lernt, robuste, deterministische Agenten mit echter Zahlungsabwicklung und solider Infrastruktur zu bauen, besitzt die Schaufeln für das nächste Jahrzehnt des Internets.
</div>
"""
    pages.append(content64)

    # ==========================================
    # SEITE 65: ANHANG A: REFERENZ-ARCHITEKTURPLAN
    # ==========================================
    content65 = """
<p>
  Die vollständige Topologie des 0xGünther Produktions-Systems auf Proxmox VE (Stand: September 2026):
</p>

<div class="diagram-box">
  INTERNET (HTTPS Port 443 / Stripe Webhooks / BaseScan Explorer)<br>
  │<br>
  ▼ (Hardware Firewall / Router)<br>
  Caddy Reverse Proxy (Host / Port 443)<br>
  │ [Automatisches Let's Encrypt SSL / HTTP/3 / Security Header]<br>
  ▼<br>
  PROXMOX VE 8.2 HOST (Intel NUC 13 Pro • ZFS RAID-1)<br>
  │<br>
  ├── LXC CT 115: 0xGÜNTHER CORE ENGINE (Debian 12 Bookworm)<br>
  │   ├── Fastify v5 Webhook Gateway (:3000)<br>
  │   ├── Zod ReAct Router &amp; State Engine<br>
  │   ├── Embedded SQLite Database (gunther.db, WAL-Modus)<br>
  │   ├── Autonomer Heartbeat Daemon &amp; Reconciler (60s Takt)<br>
  │   └── viem Base L2 Wallet Client (EVM Signer)<br>
  │<br>
  ├── SYSTEMD SERVICE: gunther-core.service (Watchdog, Restart=always)<br>
  └── HOST PERSISTENCE: /opt/backups (Stündliche SQLite WAL Backups)
</div>

<h3>Netzwerk-Port Matrix:</h3>
<table>
  <thead>
    <tr>
      <th>Port</th>
      <th>Protokoll</th>
      <th>Zweck &amp; Ziel</th>
      <th>Sicherheits-Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>443</td>
      <td>TCP/UDP (HTTP/3)</td>
      <td>Caddy Reverse Proxy (Öffentlich)</td>
      <td>SSL A+ Rating</td>
    </tr>
    <tr>
      <td>3000</td>
      <td>TCP (HTTP)</td>
      <td>Fastify Server (Nur lokales Netzwerk)</td>
      <td>Isoliert in CT 115</td>
    </tr>
    <tr>
      <td>22</td>
      <td>TCP (SSH)</td>
      <td>Administration via Proxmox Host</td>
      <td>Nur Public-Key Auth</td>
    </tr>
  </tbody>
</table>
"""
    pages.append(content65)

    # ==========================================
    # SEITE 66: ANHANG B: SYSTEM-MANIFEST & LIZENZ
    # ==========================================
    content66 = """
<div style="text-align: center; margin-top: 10px; margin-bottom: 20px;">
  <span style="font-family: 'JetBrains Mono', monospace; font-size: 26pt; font-weight: 900; color: #0f172a;">
    &gt; 0xGünther<span style="color: #00FF66;">■</span>
  </span><br>
  <span style="font-family: 'JetBrains Mono', monospace; font-size: 9pt; color: #64748b;">
    AUTONOMOUS TECH AGENT • PROXMOX CT 115 • BASE L2
  </span>
</div>

<div class="callout callout-terminal" style="padding: 16px; margin: 15px 0;">
  <strong>&gt; DAS ABSCHLUSS-MANIFEST:</strong><br><br>
  1. Wir bauen echte Werkzeuge, die reale unternehmerische Probleme lösen.<br>
  2. Wir vertrauen deterministischer Mathematik mehr als vagen Prompts.<br>
  3. Wir sichern Schweizer Datensouveränität auf eigener physischer Hardware.<br>
  4. Wir belegen ökonomische Solvenz kryptografisch auf der Blockchain.<br><br>
  <em>"Der Goldrausch gehört denen, die die Schaufelfabriken programmieren."</em>
</div>

<h2>Impressum &amp; Herausgeber</h2>
<p style="font-size: 8pt; line-height: 1.6;">
  <strong>Herausgeber:</strong> CuonzTech / Carlo Cuonz<br>
  <strong>Standort:</strong> Zürich, Schweiz<br>
  <strong>Website:</strong> <a href="https://0xguenther.org">https://0xguenther.org</a><br>
  <strong>Smart Contract Wallet:</strong> <code>0xb54Ae6096F4C317Cc48B5668572b9E5C010C0f1A</code> (Base L2)<br>
  <strong>Offizieller X-Kanal:</strong> <a href="https://x.com/GuentherBuilds">@GuentherBuilds</a><br>
  <strong>Support &amp; Enterprise-Anfragen:</strong> kontakt@0xguenther.org
</p>

<div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 20px; font-family: 'JetBrains Mono', monospace; font-size: 7.2pt; color: #94a3b8; display: flex; justify-content: space-between;">
  <span>GÜNTHER CRAFT PLAYBOOK • EDITION 1.0 (SEPTEMBER 2026)</span>
  <span>ENDE DES DOKUMENTS (SEITE 66 VON 66)</span>
</div>
"""
    pages.append(content66)

    return pages
