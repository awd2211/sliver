// Session types
export interface Session {
  id: string;
  name: string;
  hostname: string;
  username: string;
  os: string;
  arch: string;
  transport: string;
  remoteAddress: string;
  pid: number;
  lastCheckin: string;
  isDead: boolean;
}

// Beacon types
export interface Beacon {
  id: string;
  name: string;
  hostname: string;
  username: string;
  os: string;
  arch: string;
  transport: string;
  remoteAddress: string;
  pid: number;
  interval: number;
  jitter: number;
  nextCheckin: string;
  lastCheckin: string;
  isDead: boolean;
}

// Job types
export interface Job {
  id: number;
  name: string;
  description: string;
  protocol: string;
  port: number;
}

// Implant types
export interface Implant {
  id: string;
  name: string;
  os: string;
  arch: string;
  format: string;
  isBeacon: boolean;
  createdAt: string;
  debug: boolean;
  evasion: boolean;
}

export interface C2Config {
  priority: number;
  url: string;
}

export interface GenerateImplantRequest {
  name: string;
  os: string;
  arch: string;
  format: string;
  isBeacon: boolean;

  // C2 Configuration
  mtlsC2?: C2Config[];
  httpC2?: C2Config[];
  dnsC2?: C2Config[];
  wgC2?: C2Config[];
  tcpPivotC2?: C2Config[];
  namedPipeC2?: C2Config[];

  // Beacon Configuration
  beaconInterval?: number;
  beaconJitter?: number;

  // Connection Configuration
  reconnectInterval?: number;
  maxConnectionErrors?: number;
  pollTimeout?: number;
  connectionStrategy?: 'sequential' | 'random';

  // WireGuard Configuration
  wgPeerTunIP?: string;
  wgKeyExchangePort?: number;
  wgTcpCommsPort?: number;

  // Security/Obfuscation
  debug?: boolean;
  evasion?: boolean;
  obfuscateSymbols?: boolean;
  sgn?: boolean;

  // Execution Limits
  limitDomainJoined?: boolean;
  limitDatetime?: string;
  limitHostname?: string;
  limitUsername?: string;
  limitFileExists?: string;
  limitLocale?: string;

  // Output Format Options
  isService?: boolean;
  runAtLoad?: boolean;

  // Advanced
  templateName?: string;
  canaryDomains?: string[];
  httpC2ConfigName?: string;
  netGoEnabled?: boolean;
  trafficEncodersEnabled?: boolean;
  trafficEncoders?: string[];
}

// Builder types
export interface Builder {
  name: string;
  operatorName: string;
  goos: string;
  goarch: string;
  templates: string[];
  crossCompilers: CrossCompiler[];
}

export interface CrossCompiler {
  targetGoos: string;
  targetGoarch: string;
  ccPath: string;
  cxxPath: string;
}

// Operator types
export interface Operator {
  online: boolean;
  name: string;
}

// Loot types
export interface Loot {
  id: string;
  name: string;
  type: string;
  credentialType?: string;
  fileType?: string;
  originHost?: string;
  size: number;
}

// Credential types
export interface Credential {
  id: string;
  username: string;
  password?: string;
  plaintext?: string;
  hash?: string;
  hashType?: string;
  isCracked: boolean;
  originHost?: string;
  collection?: string;
}

// Host types
export interface Host {
  id: string;
  hostname: string;
  osVersion: string;
  iocs: IOC[];
  extensions: string[];
  locale: string;
  firstContact: string;
}

export interface IOC {
  id: string;
  path: string;
  fileHash: string;
}

// Website types
export interface Website {
  id: string;
  name: string;
  contents: WebContent[];
}

export interface WebContent {
  id: string;
  websiteId: string;
  path: string;
  contentType: string;
  size: number;
}

// Auth types
export interface User {
  username: string;
  token: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Listener request types
export interface MTLSListenerRequest {
  host: string;
  port: number;
  persistent?: boolean;
}

export interface HTTPListenerRequest {
  domain: string;
  host: string;
  port: number;
  secure?: boolean;
  website?: string;
  persistent?: boolean;
}

export interface DNSListenerRequest {
  domains: string[];
  canaries?: boolean;
  host?: string;
  port?: number;
  persistent?: boolean;
}

export interface WGListenerRequest {
  host: string;
  port: number;
  keyExchangePort?: number;
  nPort?: number; // Virtual TUN interface port
  persistent?: boolean;
}

export interface StageListenerRequest {
  protocol: string;
  host: string;
  port: number;
  profileName?: string;
  prepend?: string;
  compress?: boolean;
  persistent?: boolean;
}

// Interactive types
export interface ProcessInfo {
  pid: number;
  ppid: number;
  executable: string;
  owner: string;
  architecture: string;
  sessionId: number;
  cmdLine: string[];
}

export interface FileInfo {
  name: string;
  isDir: boolean;
  size: number;
  modTime: string;
  mode: string;
  link: string;
}

export interface NetworkInterface {
  index: number;
  name: string;
  mac: string;
  ipAddresses: string[];
}

export interface SockTabEntry {
  localAddr: string;
  remoteAddr: string;
  protocol: string;
  state: string;
  pid: number;
  process: string;
}

export interface SystemInfo {
  hostname: string;
  username: string;
  uid: string;
  gid: string;
  os: string;
  arch: string;
  pid: number;
  remoteAddress: string;
}

export interface ExecuteResult {
  stdout: string;
  stderr: string;
  status: number;
}

// WebSocket message types
export interface WSMessage {
  type: string;
  payload: unknown;
}

export interface ShellStartPayload {
  sessionId: string;
  path?: string;
  pty: boolean;
}

export interface ShellInputPayload {
  sessionId: string;
  tunnelId: number;
  data: string;
}

export interface ShellOutputPayload {
  sessionId: string;
  tunnelId: number;
  data: string;
}

export interface ShellResizePayload {
  sessionId: string;
  tunnelId: number;
  cols: number;
  rows: number;
}

// Port forwarding types
export interface PortForward {
  id: number;
  sessionId: string;
  bindAddress: string;
  remoteAddress: string;
}

export interface PortForwardRequest {
  bindAddress: string;
  remoteAddress: string;
}

// Reverse port forwarding types
export interface ReversePortForward {
  id: number;
  sessionId: string;
  bindAddress: string;
  forwardAddress: string;
}

export interface ReversePortForwardRequest {
  bindAddress: string;
  forwardAddress: string;
}

// SOCKS proxy types
export interface SocksProxy {
  id: number;
  sessionId: string;
  bindAddress: string;
  username?: string;
}

export interface SocksProxyRequest {
  bindAddress: string;
  username?: string;
  password?: string;
}

// Privilege escalation types
export interface PrivilegeInfo {
  name: string;
  description: string;
  enabled: boolean;
}

export interface GetSystemResult {
  success: boolean;
  output: string;
}

// Armory types
export interface ArmoryPackage {
  name: string;
  commandName: string;
  manifestUrl: string;
  repoUrl: string;
  helpText: string;
  version: string;
  isAlias: boolean;
  isExtension: boolean;
  isInstalled: boolean;
  installedVersion?: string;
}

export interface ArmoryIndex {
  aliases: ArmoryPackage[];
  extensions: ArmoryPackage[];
}

// C2 Profile types
export interface C2Profile {
  id?: string;
  name: string;
  created?: number;
  serverConfig?: Record<string, unknown>;
  implantConfig?: Record<string, unknown>;
}

// Certificate types
export interface Certificate {
  id: string;
  commonName: string;
  type: 'ca' | 'server' | 'client';
  notBefore: string;
  notAfter: string;
  fingerprint: string;
}

// Canary types
export interface Canary {
  id: string;
  implantName: string;
  domain: string;
  triggered: boolean;
  triggeredTime?: string;
  triggeredCount: number;
  firstTrigger?: string;
  latestTrigger?: string;
}

// Dashboard types
export interface DashboardStats {
  sessions: number;
  beacons: number;
  jobs: number;
  implants: number;
  hosts: number;
  credentials: number;
  loot: number;
}

export interface ActivityEvent {
  id: string;
  type: 'session_connect' | 'session_disconnect' | 'beacon_connect' | 'beacon_disconnect' | 'job_started' | 'job_stopped' | 'implant_built' | 'canary_triggered';
  message: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

// Environment variables type
export interface EnvironmentVariable {
  name: string;
  value: string;
}

export interface SetEnvRequest {
  name: string;
  value: string;
}

export interface UnsetEnvRequest {
  name: string;
}

// Beacon task types
export interface BeaconTask {
  id: string;
  beaconId: string;
  type: string;
  status: 'pending' | 'completed' | 'failed' | 'canceled';
  description: string;
  createdAt: string;
  sentAt?: string;
  completedAt?: string;
  result?: string;
  error?: string;
}

// Beacon command request types
export interface BeaconCommandRequest {
  command: string;
  args?: string[];
}

export interface BeaconWhoamiRequest {}

export interface BeaconPwdRequest {}

export interface BeaconLsRequest {
  path: string;
}

export interface BeaconCdRequest {
  path: string;
}

export interface BeaconCatRequest {
  path: string;
}

export interface BeaconDownloadRequest {
  path: string;
}

export interface BeaconUploadRequest {
  path: string;
  data: string; // base64 encoded
}

export interface BeaconPsRequest {}

export interface BeaconNetstateRequest {}

export interface BeaconIfconfigRequest {}

export interface BeaconExecuteRequest {
  path: string;
  args: string[];
  output: boolean;
}

// Registry types (Windows)
export type RegistryHive = 'HKEY_CLASSES_ROOT' | 'HKEY_CURRENT_USER' | 'HKEY_LOCAL_MACHINE' | 'HKEY_USERS' | 'HKEY_CURRENT_CONFIG';

export type RegistryValueType = 'REG_SZ' | 'REG_EXPAND_SZ' | 'REG_BINARY' | 'REG_DWORD' | 'REG_QWORD' | 'REG_MULTI_SZ' | 'REG_NONE';

export interface RegistryKey {
  path: string;
  subkeys: string[];
  values: RegistryValue[];
}

export interface RegistryValue {
  name: string;
  type: RegistryValueType;
  data: string | number | string[];
}

export interface RegistryReadRequest {
  hive: RegistryHive;
  path: string;
}

export interface RegistryWriteRequest {
  hive: RegistryHive;
  path: string;
  valueName: string;
  valueType: RegistryValueType;
  data: string | number | string[];
}

export interface RegistryCreateKeyRequest {
  hive: RegistryHive;
  path: string;
}

export interface RegistryDeleteKeyRequest {
  hive: RegistryHive;
  path: string;
}

export interface RegistryDeleteValueRequest {
  hive: RegistryHive;
  path: string;
  valueName: string;
}

// Extended privilege escalation types
export interface RunAsRequest {
  username: string;
  domain?: string;
  password: string;
  program: string;
  args?: string[];
  processName?: string;
}

export interface MakeTokenRequest {
  username: string;
  domain?: string;
  password: string;
  logonType?: number;
}

export interface TokenInfo {
  username: string;
  domain: string;
  sid: string;
  isElevated: boolean;
  integrityLevel: string;
}

// Pivot types
export type PivotType = 'tcp' | 'named-pipe' | 'smb';

export interface PivotListener {
  id: string;
  type: PivotType;
  bindAddress: string;
  sessionId: string;
}

export interface PivotPeer {
  peerId: string;
  name: string;
}

export interface PivotGraph {
  listeners: PivotListener[];
  peers: PivotPeer[];
  edges: PivotEdge[];
}

export interface PivotEdge {
  sourceSessionId: string;
  destinationSessionId: string;
  type: PivotType;
}

export interface StartPivotListenerRequest {
  type: PivotType;
  bindAddress: string;
}

export interface StopPivotListenerRequest {
  listenerId: string;
}

// Network topology node for visualization
export interface TopologyNode {
  id: string;
  type: 'server' | 'session' | 'beacon';
  data: {
    label: string;
    hostname?: string;
    username?: string;
    os?: string;
    arch?: string;
    transport?: string;
    remoteAddress?: string;
    isOperator?: boolean;
    isDead?: boolean;
  };
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  type: 'direct' | 'pivot';
  data?: {
    pivotType?: PivotType;
  };
}

// Cursed (Browser manipulation) types
export interface CursedProcess {
  pid: number;
  name: string;
  debugURL: string;
  executable: string;
}

export interface CursedChrome {
  processId: number;
  remoteDebuggingPort: number;
  windows: CursedWindow[];
}

export interface CursedWindow {
  id: string;
  title: string;
  url: string;
  type: 'page' | 'popup' | 'background_page' | 'service_worker';
}

export interface CursedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
}

export interface CursedScreenshot {
  windowId: string;
  data: string; // base64
  format: 'png' | 'jpeg';
}

export interface CursedInjectPayload {
  windowId: string;
  script: string;
}

export interface CursedKeyloggerRequest {
  windowId: string;
  enabled: boolean;
}

// WASM Extension types
export interface WasmExtension {
  name: string;
  help: string;
  init: string;
  isExtension: boolean;
  isAlias: boolean;
}

// Execute types - Code Execution Framework
export interface ExecuteRequest {
  path: string;
  args: string[];
  output: boolean;
  ppid?: number;
}

export interface ExecuteAssemblyRequest {
  assembly: string; // base64 encoded
  assemblyArgs: string;
  process: string;
  isDLL: boolean;
  arch: string;
  className?: string;
  method?: string;
  appDomain?: string;
  ppid?: number;
}

export interface ExecuteShellcodeRequest {
  data: string; // base64 encoded shellcode
  pid?: number;
  rwxPages: boolean;
  shikata: boolean;
  iterations?: number;
  process?: string;
  ppid?: number;
}

export interface MigrateRequest {
  pid: number;
  name?: string;
}

export interface SpawnDllRequest {
  data: string; // base64 encoded DLL
  processName: string;
  exportName: string;
  args: string;
  ppid?: number;
}

export interface SideloadRequest {
  data: string; // base64 encoded DLL/SharedLib
  processName: string;
  args: string;
  entryPoint: string;
  ppid?: number;
}

export interface MsfStagerRequest {
  arch: string;
  format: string;
  host: string;
  port: number;
  protocol: string;
  badChars?: string[];
}

// Sliver Stager types
export interface StagerConfig {
  protocol: 'tcp' | 'http' | 'https';
  host: string;
  port: number;
  arch: 'amd64' | '386';
  format: 'shellcode' | 'exe' | 'dll' | 'shared';
  badChars?: string;
  prepend?: string;
  certPath?: string;
  keyPath?: string;
}

export interface GenerateStagerRequest {
  protocol: string;
  lhost: string;
  lport: number;
  arch: string;
  format: string;
  badChars?: string;
  saveToFile?: boolean;
}

export interface Stager {
  name: string;
  protocol: string;
  host: string;
  port: number;
  arch: string;
  format: string;
  data?: string; // base64 encoded
  createdAt: string;
}

// Task types
export interface Task {
  id: string;
  type: string;
  state: 'pending' | 'sent' | 'completed' | 'failed' | 'canceled';
  createdAt: string;
  sentAt?: string;
  completedAt?: string;
  description: string;
  request?: string;
  response?: string;
  error?: string;
}

export interface TaskFilter {
  state?: string;
  type?: string;
}

// Screenshot types
export interface Screenshot {
  id: string;
  sessionId: string;
  data: string; // base64 encoded PNG
  width: number;
  height: number;
  capturedAt: string;
}

// Reaction types - Event-triggered automation
export type ReactionEventType =
  | 'session_opened'
  | 'session_closed'
  | 'beacon_registered'
  | 'beacon_checkin'
  | 'canary_triggered'
  | 'loot_added'
  | 'credential_added'
  | 'watchdog_triggered';

export interface Reaction {
  id: string;
  name: string;
  eventType: ReactionEventType;
  commands: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  triggerCount: number;
  lastTriggered?: string;
}

export interface CreateReactionRequest {
  name: string;
  eventType: ReactionEventType;
  commands: string[];
  enabled?: boolean;
}

export interface UpdateReactionRequest {
  name?: string;
  eventType?: ReactionEventType;
  commands?: string[];
  enabled?: boolean;
}

// SSH types - Remote command execution
export type SSHAuthMethod = 'password' | 'key' | 'kerberos';

export interface SSHCommandRequest {
  hostname: string;
  port: number;
  username: string;
  authMethod: SSHAuthMethod;
  password?: string;
  privateKey?: string; // base64 encoded
  passphrase?: string;
  command: string;
  // Kerberos options
  realm?: string;
  krb5Conf?: string;
  keytab?: string; // base64 encoded
}

export interface SSHCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// TaskMany types - Batch task execution
export type TaskManyCommandType =
  | 'execute'
  | 'execute-assembly'
  | 'execute-shellcode'
  | 'download'
  | 'upload'
  | 'screenshot'
  | 'ps'
  | 'netstat'
  | 'ifconfig'
  | 'whoami'
  | 'pwd'
  | 'env'
  | 'kill'
  | 'custom';

export interface TaskManyRequest {
  targets: string[]; // Session/Beacon IDs
  targetType: 'session' | 'beacon';
  commandType: TaskManyCommandType;
  command?: string;
  args?: Record<string, unknown>;
}

export interface TaskManyResult {
  targetId: string;
  targetName: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  result?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface TaskManyResponse {
  id: string;
  totalTargets: number;
  completedTargets: number;
  results: TaskManyResult[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
}

// ============ NEW TYPES FOR MISSING FEATURES ============

// Implant Profile types
export interface ImplantProfile {
  name: string;
  config: ImplantConfig;
}

export interface ImplantConfig {
  goos: string;
  goarch: string;
  name: string;
  debug: boolean;
  evasion: boolean;
  obfuscateSymbols: boolean;
  reconn: number;
  maxErrors: number;
  pollTimeout: number;
  isBeacon: boolean;
  beaconInterval: number;
  beaconJitter: number;
  c2: C2Config[];
  format: string;
  isSharedLib: boolean;
  isService: boolean;
  isShellcode: boolean;
  runAtLoad: boolean;
  templatesDir: string;
  sgn: boolean;
  trafficEncoders: string[];
  canaries: string[];
  limitDomainJoined: boolean;
  limitHostname: string;
  limitUsername: string;
  limitDatetime: string;
  limitFileExists: string;
  limitLocale: string;
  assets: string[];
  connectionStrategy: string;
  wgImplantPrivKey: string;
  wgServerPubKey: string;
  wgPeerTunIP: string;
  wgKeyExchangePort: number;
  wgTcpCommsPort: number;
}

export interface CreateProfileRequest {
  name: string;
  config: Partial<ImplantConfig>;
}

// Alias types
export interface Alias {
  name: string;
  commandName: string;
  originalAuthor: string;
  repoURL: string;
  manifestPath: string;
  help: string;
  longHelp: string;
  isInstalled: boolean;
  installedVersion?: string;
  commands: AliasCommand[];
}

export interface AliasCommand {
  name: string;
  entrypoint: string;
  help: string;
  longHelp: string;
  allowArgs: boolean;
  defaultArgs: string[];
  files: AliasFile[];
  isAssembly: boolean;
  isReflective: boolean;
}

export interface AliasFile {
  os: string;
  arch: string;
  path: string;
}

// Extension types
export interface Extension {
  name: string;
  commandName: string;
  help: string;
  longHelp: string;
  repoURL: string;
  manifestPath: string;
  originalAuthor: string;
  isInstalled: boolean;
  installedVersion?: string;
  version: string;
  init: string;
  files: ExtensionFile[];
  arguments: ExtensionArgument[];
  entrypoint: string;
  dependsOn: string;
}

export interface ExtensionFile {
  os: string;
  arch: string;
  path: string;
}

export interface ExtensionArgument {
  name: string;
  type: string;
  desc: string;
  optional: boolean;
}

// Windows Service types
export interface WindowsService {
  name: string;
  displayName: string;
  description: string;
  status: 'running' | 'stopped' | 'paused' | 'start_pending' | 'stop_pending' | 'continue_pending' | 'pause_pending' | 'unknown';
  startType: 'auto' | 'boot' | 'demand' | 'disabled' | 'system';
  binPath: string;
  account: string;
  pid: number;
}

export interface ServiceControlRequest {
  name: string;
  action: 'start' | 'stop' | 'restart';
}

// Process dump types
export interface ProcdumpRequest {
  pid: number;
  name?: string;
  timeout?: number;
}

export interface ProcdumpResult {
  data: string; // base64 encoded
  size: number;
  filename: string;
}

// File operation types
export interface MoveFileRequest {
  src: string;
  dst: string;
}

export interface CopyFileRequest {
  src: string;
  dst: string;
}

export interface GrepRequest {
  path: string;
  pattern: string;
  recursive?: boolean;
  insensitive?: boolean;
}

export interface GrepResult {
  matches: GrepMatch[];
}

export interface GrepMatch {
  path: string;
  lineNumber: number;
  line: string;
}

export interface HeadTailRequest {
  path: string;
  lines?: number;
  bytes?: number;
}

export interface HeadTailResult {
  data: string;
  path: string;
}

// File permission types
export interface ChmodRequest {
  path: string;
  mode: string;
  recursive?: boolean;
}

export interface ChownRequest {
  path: string;
  uid: string;
  gid: string;
  recursive?: boolean;
}

export interface ChtimesRequest {
  path: string;
  atime: string; // ISO date string
  mtime: string; // ISO date string
}

// Memory file types
export interface Memfile {
  fd: number;
  path: string;
  size: number;
}

export interface CreateMemfileRequest {
  data?: string; // base64 encoded initial data
}

// Mount types
export interface MountInfo {
  device: string;
  mountPoint: string;
  fsType: string;
  options: string[];
  total: number;
  free: number;
  used: number;
}

// PsExec types
export interface PsExecRequest {
  hostname: string;
  exe: string;
  args?: string[];
  profile?: string;
  service?: string;
  domain?: string;
  username?: string;
  password?: string;
}

export interface PsExecResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

// Backdoor types
export interface BackdoorRequest {
  remotePath: string;
  profileName: string;
}

export interface BackdoorResult {
  success: boolean;
  path: string;
  size: number;
}

// DLL Hijack types
export interface DllHijackRequest {
  targetPath: string;
  referencePath: string;
  referenceDll: string;
  profileName: string;
}

export interface DllHijackResult {
  success: boolean;
  hijackedPath: string;
}

// Reconfig types
export interface ReconfigRequest {
  beaconInterval?: number;
  beaconJitter?: number;
  reconnectInterval?: number;
  c2?: C2Config[];
}

// Crack types
export interface CrackStation {
  id: string;
  name: string;
  operatorName: string;
  state: 'idle' | 'cracking' | 'syncing' | 'offline';
  benchmarks: CrackBenchmark[];
  cudaVersion: string;
  driverVersion: string;
  gpus: CrackGPU[];
}

export interface CrackGPU {
  id: number;
  name: string;
  type: string;
  memoryTotal: number;
  memoryFree: number;
  temperature: number;
  fanSpeed: number;
  utilization: number;
}

export interface CrackBenchmark {
  name: string;
  hashType: number;
  speed: number;
}

export interface Wordlist {
  id: string;
  name: string;
  path: string;
  size: number;
  lineCount: number;
}

export interface CrackRule {
  id: string;
  name: string;
  path: string;
  size: number;
}

export interface Hcstat2 {
  id: string;
  name: string;
  path: string;
  size: number;
}

export interface CrackJob {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  hashType: number;
  hashFile: string;
  progress: number;
  speed: number;
  recovered: number;
  total: number;
  startedAt?: string;
  completedAt?: string;
  station?: string;
}

export interface StartCrackJobRequest {
  name: string;
  hashType: number;
  hashes: string[];
  attackMode: 'dictionary' | 'combinator' | 'brute_force' | 'hybrid_wordlist' | 'hybrid_mask' | 'association';
  wordlistIds?: string[];
  ruleIds?: string[];
  mask?: string;
  markovHcstat2?: string;
  minLength?: number;
  maxLength?: number;
  customCharsets?: string[];
}

// Traffic Encoder types
export interface TrafficEncoder {
  id: string;
  name: string;
  wasmPath: string;
  size: number;
  testPassed: boolean;
}

export interface AddTrafficEncoderRequest {
  name: string;
  wasmData: string; // base64 encoded
}

// Ping types
export interface PingResult {
  nonce: number;
}

// Clean types
export interface CleanRequest {
  sessions?: boolean;
  beacons?: boolean;
  jobs?: boolean;
  implants?: boolean;
  hosts?: boolean;
  loot?: boolean;
  credentials?: boolean;
}

// License types
export interface License {
  name: string;
  text: string;
}

// Update types
export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseNotes?: string;
  releaseUrl?: string;
}

// Compiler info types
export interface CompilerInfo {
  goos: string;
  goarch: string;
  goVersion: string;
  crossCompilers: CrossCompiler[];
  supportedTargets: SupportedTarget[];
}

export interface SupportedTarget {
  goos: string;
  goarch: string;
  format: string;
  cgoEnabled: boolean;
}

// IOC types
export interface IOC {
  id: string;
  path: string;
  fileHash: string;
  iocType: 'file' | 'registry' | 'network' | 'process' | 'other';
  description?: string;
  createdAt: string;
}

export interface CreateIOCRequest {
  path: string;
  fileHash?: string;
  iocType: 'file' | 'registry' | 'network' | 'process' | 'other';
  description?: string;
}

// WASM execution types
export interface WasmExecRequest {
  data: string; // base64 encoded WASM
  funcName: string;
  args?: string[];
  memFS?: MemFile[];
}

export interface MemFile {
  name: string;
  data: string; // base64 encoded
}

export interface WasmExecResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
}

