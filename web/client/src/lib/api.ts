const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(username: string, password: string) {
    return this.request<{ token: string; username: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async getCurrentUser() {
    return this.request<{ username: string }>('/auth/me');
  }

  // Sessions
  async getSessions() {
    return this.request<{ sessions: import('@/types').Session[] }>('/sessions');
  }

  async getSession(id: string) {
    return this.request<{ session: import('@/types').Session }>(`/sessions/${id}`);
  }

  async killSession(id: string) {
    return this.request(`/sessions/${id}/kill`, { method: 'POST' });
  }

  // Beacons
  async getBeacons() {
    return this.request<{ beacons: import('@/types').Beacon[] }>('/beacons');
  }

  async getBeacon(id: string) {
    return this.request<{ beacon: import('@/types').Beacon }>(`/beacons/${id}`);
  }

  async killBeacon(id: string) {
    return this.request(`/beacons/${id}`, { method: 'DELETE' });
  }

  async getBeaconTasks(id: string, filter?: { status?: string }) {
    const query = filter?.status ? `?status=${filter.status}` : '';
    return this.request<{ tasks: import('@/types').BeaconTask[] }>(`/beacons/${id}/tasks${query}`);
  }

  async cancelBeaconTask(beaconId: string, taskId: string) {
    return this.request<{ success: boolean }>(`/beacons/${beaconId}/tasks/${taskId}/cancel`, {
      method: 'POST',
    });
  }

  async getBeaconTaskResult(beaconId: string, taskId: string) {
    return this.request<import('@/types').BeaconTask>(`/beacons/${beaconId}/tasks/${taskId}`);
  }

  // Beacon commands - queue tasks for execution on next check-in
  async beaconWhoami(beaconId: string) {
    return this.request<{ task: import('@/types').BeaconTask }>(`/beacons/${beaconId}/whoami`, {
      method: 'POST',
    });
  }

  async beaconPwd(beaconId: string) {
    return this.request<{ task: import('@/types').BeaconTask }>(`/beacons/${beaconId}/pwd`, {
      method: 'POST',
    });
  }

  async beaconLs(beaconId: string, path: string) {
    return this.request<{ task: import('@/types').BeaconTask }>(`/beacons/${beaconId}/ls`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  async beaconCd(beaconId: string, path: string) {
    return this.request<{ task: import('@/types').BeaconTask }>(`/beacons/${beaconId}/cd`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  async beaconCat(beaconId: string, path: string) {
    return this.request<{ task: import('@/types').BeaconTask }>(`/beacons/${beaconId}/cat`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  async beaconDownload(beaconId: string, path: string) {
    return this.request<{ task: import('@/types').BeaconTask }>(`/beacons/${beaconId}/download`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  async beaconPs(beaconId: string) {
    return this.request<{ task: import('@/types').BeaconTask }>(`/beacons/${beaconId}/ps`, {
      method: 'POST',
    });
  }

  async beaconNetstat(beaconId: string) {
    return this.request<{ task: import('@/types').BeaconTask }>(`/beacons/${beaconId}/netstat`, {
      method: 'POST',
    });
  }

  async beaconIfconfig(beaconId: string) {
    return this.request<{ task: import('@/types').BeaconTask }>(`/beacons/${beaconId}/ifconfig`, {
      method: 'POST',
    });
  }

  async beaconExecute(beaconId: string, req: import('@/types').BeaconExecuteRequest) {
    return this.request<{ task: import('@/types').BeaconTask }>(`/beacons/${beaconId}/execute`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async beaconInteractive(beaconId: string) {
    return this.request<{ sessionId: string }>(`/beacons/${beaconId}/interactive`, {
      method: 'POST',
    });
  }

  // Jobs
  async getJobs() {
    return this.request<{ jobs: import('@/types').Job[] }>('/jobs');
  }

  async killJob(id: number) {
    return this.request(`/jobs/${id}`, { method: 'DELETE' });
  }

  async startMTLSListener(req: import('@/types').MTLSListenerRequest) {
    return this.request('/jobs/mtls', { method: 'POST', body: JSON.stringify(req) });
  }

  async startHTTPListener(req: import('@/types').HTTPListenerRequest) {
    return this.request('/jobs/http', { method: 'POST', body: JSON.stringify(req) });
  }

  async startHTTPSListener(req: import('@/types').HTTPListenerRequest) {
    return this.request('/jobs/https', { method: 'POST', body: JSON.stringify(req) });
  }

  async startDNSListener(req: import('@/types').DNSListenerRequest) {
    return this.request('/jobs/dns', { method: 'POST', body: JSON.stringify(req) });
  }

  async startWGListener(req: import('@/types').WGListenerRequest) {
    return this.request('/jobs/wg', { method: 'POST', body: JSON.stringify(req) });
  }

  async startStageListener(req: import('@/types').StageListenerRequest) {
    return this.request('/jobs/stage', { method: 'POST', body: JSON.stringify(req) });
  }

  // Implants
  async getImplants() {
    return this.request<{ implants: import('@/types').Implant[] }>('/implants');
  }

  async getImplant(name: string) {
    return this.request<{ implant: import('@/types').Implant }>(`/implants/${name}`);
  }

  async generateImplant(req: import('@/types').GenerateImplantRequest) {
    return this.request('/implants/generate', { method: 'POST', body: JSON.stringify(req) });
  }

  async deleteImplant(name: string) {
    return this.request(`/implants/${name}`, { method: 'DELETE' });
  }

  async downloadImplant(name: string) {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}/implants/${name}/download`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(error.error || 'Download failed');
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = name;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match) {
        filename = match[1];
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Stagers
  async generateStager(req: import('@/types').GenerateStagerRequest) {
    return this.request<{ stager: import('@/types').Stager }>('/stagers/generate', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async downloadStager(req: import('@/types').GenerateStagerRequest) {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}/stagers/download`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Stager generation failed' }));
      throw new Error(error.error || 'Stager generation failed');
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `stager_${req.arch}_${req.protocol}.${req.format === 'shellcode' ? 'bin' : req.format}`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match) {
        filename = match[1];
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Builders
  async getBuilders() {
    return this.request<{ builders: import('@/types').Builder[] }>('/builders');
  }

  // Operators
  async getOperators() {
    return this.request<{ operators: import('@/types').Operator[] }>('/operators');
  }

  // Loot
  async getLoot() {
    return this.request<{ loot: import('@/types').Loot[] }>('/loot');
  }

  async getLootItem(id: string) {
    return this.request<{ loot: import('@/types').Loot }>(`/loot/${id}`);
  }

  async deleteLoot(id: string) {
    return this.request(`/loot/${id}`, { method: 'DELETE' });
  }

  async getLootContent(id: string) {
    return this.request<{ content: string; contentType: string }>(`/loot/${id}/content`);
  }

  async downloadLoot(id: string, name: string) {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}/loot/${id}/download`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(error.error || 'Download failed');
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = name;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match) {
        filename = match[1];
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Credentials
  async getCredentials() {
    return this.request<{ credentials: import('@/types').Credential[] }>('/credentials');
  }

  async addCredential(cred: Partial<import('@/types').Credential>) {
    return this.request('/credentials', { method: 'POST', body: JSON.stringify(cred) });
  }

  async deleteCredential(id: string) {
    return this.request(`/credentials/${id}`, { method: 'DELETE' });
  }

  // Hosts
  async getHosts() {
    return this.request<{ hosts: import('@/types').Host[] }>('/hosts');
  }

  async getHost(id: string) {
    return this.request<{ host: import('@/types').Host }>(`/hosts/${id}`);
  }

  // Websites
  async getWebsites() {
    return this.request<{ websites: import('@/types').Website[] }>('/websites');
  }

  async getWebsite(name: string) {
    return this.request<{ website: import('@/types').Website }>(`/websites/${name}`);
  }

  async addWebsite(name: string) {
    return this.request('/websites', { method: 'POST', body: JSON.stringify({ name }) });
  }

  async deleteWebsite(name: string) {
    return this.request(`/websites/${name}`, { method: 'DELETE' });
  }

  async uploadWebsiteContent(websiteName: string, path: string, file: File, contentType?: string) {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    if (contentType) {
      formData.append('contentType', contentType);
    }

    const response = await fetch(`${API_BASE}/websites/${websiteName}/content`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async deleteWebsiteContent(websiteName: string, contentId: string) {
    return this.request(`/websites/${websiteName}/content/${contentId}`, { method: 'DELETE' });
  }

  // Interactive session commands
  async getProcesses(sessionId: string) {
    return this.request<{ processes: import('@/types').ProcessInfo[] }>(`/sessions/${sessionId}/ps`);
  }

  async killProcess(sessionId: string, pid: number) {
    return this.request(`/sessions/${sessionId}/kill-process`, {
      method: 'POST',
      body: JSON.stringify({ pid }),
    });
  }

  async migrateToProcess(sessionId: string, pid: number) {
    return this.request(`/sessions/${sessionId}/migrate`, {
      method: 'POST',
      body: JSON.stringify({ pid }),
    });
  }

  async listFiles(sessionId: string, path: string) {
    return this.request<{ files: import('@/types').FileInfo[] }>(`/sessions/${sessionId}/ls`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  async makeDirectory(sessionId: string, path: string) {
    return this.request(`/sessions/${sessionId}/mkdir`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  async deleteFile(sessionId: string, path: string) {
    return this.request(`/sessions/${sessionId}/rm`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  async downloadFile(sessionId: string, path: string) {
    // For file downloads, we need to handle blob response
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}/sessions/${sessionId}/download`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path }),
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();
    const filename = path.split('/').pop() || 'download';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async uploadFile(sessionId: string, path: string, file: File) {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    const response = await fetch(`${API_BASE}/sessions/${sessionId}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async getNetworkInterfaces(sessionId: string) {
    return this.request<{ interfaces: import('@/types').NetworkInterface[] }>(`/sessions/${sessionId}/ifconfig`);
  }

  async getEnvironmentVariables(sessionId: string) {
    return this.request<{ variables: import('@/types').EnvironmentVariable[] }>(`/sessions/${sessionId}/env`);
  }

  async setEnvironmentVariable(sessionId: string, req: import('@/types').SetEnvRequest) {
    return this.request<{ success: boolean }>(`/sessions/${sessionId}/setenv`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async unsetEnvironmentVariable(sessionId: string, name: string) {
    return this.request<{ success: boolean }>(`/sessions/${sessionId}/unsetenv`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async getNetstat(sessionId: string) {
    return this.request<{ entries: import('@/types').SockTabEntry[] }>(`/sessions/${sessionId}/netstat`);
  }

  async getSystemInfo(sessionId: string) {
    return this.request<{ info: import('@/types').SystemInfo }>(`/sessions/${sessionId}/info`);
  }

  async executeCommand(sessionId: string, path: string, args: string[]) {
    return this.request<import('@/types').ExecuteResult>(`/sessions/${sessionId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ path, args }),
    });
  }

  async takeScreenshot(sessionId: string) {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}/sessions/${sessionId}/screenshot`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      throw new Error('Screenshot failed');
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  // Port forwarding
  async getPortForwards(sessionId: string) {
    return this.request<{ portForwards: import('@/types').PortForward[] }>(`/sessions/${sessionId}/portfwd`);
  }

  async createPortForward(sessionId: string, req: import('@/types').PortForwardRequest) {
    return this.request<{ portForward: import('@/types').PortForward }>(`/sessions/${sessionId}/portfwd`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async deletePortForward(sessionId: string, id: number) {
    return this.request(`/sessions/${sessionId}/portfwd/${id}`, { method: 'DELETE' });
  }

  // Reverse port forwarding
  async getReversePortForwards(sessionId: string) {
    return this.request<{ reversePortForwards: import('@/types').ReversePortForward[] }>(`/sessions/${sessionId}/rportfwd`);
  }

  async createReversePortForward(sessionId: string, req: import('@/types').ReversePortForwardRequest) {
    return this.request<{ reversePortForward: import('@/types').ReversePortForward }>(`/sessions/${sessionId}/rportfwd`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async deleteReversePortForward(sessionId: string, id: number) {
    return this.request(`/sessions/${sessionId}/rportfwd/${id}`, { method: 'DELETE' });
  }

  // SOCKS proxy
  async getSocksProxies(sessionId: string) {
    return this.request<{ socksProxies: import('@/types').SocksProxy[] }>(`/sessions/${sessionId}/socks`);
  }

  async createSocksProxy(sessionId: string, req: import('@/types').SocksProxyRequest) {
    return this.request<{ socksProxy: import('@/types').SocksProxy }>(`/sessions/${sessionId}/socks`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async deleteSocksProxy(sessionId: string, id: number) {
    return this.request(`/sessions/${sessionId}/socks/${id}`, { method: 'DELETE' });
  }

  // Privilege escalation
  async getPrivileges(sessionId: string) {
    return this.request<{ privileges: import('@/types').PrivilegeInfo[] }>(`/sessions/${sessionId}/privs`);
  }

  async getSystem(sessionId: string) {
    return this.request<import('@/types').GetSystemResult>(`/sessions/${sessionId}/getsystem`, {
      method: 'POST',
    });
  }

  async impersonate(sessionId: string, process: string) {
    return this.request(`/sessions/${sessionId}/impersonate`, {
      method: 'POST',
      body: JSON.stringify({ process }),
    });
  }

  // Windows Registry operations
  async registryRead(sessionId: string, req: import('@/types').RegistryReadRequest) {
    return this.request<{ key: import('@/types').RegistryKey }>(`/sessions/${sessionId}/registry/read`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async registryWrite(sessionId: string, req: import('@/types').RegistryWriteRequest) {
    return this.request(`/sessions/${sessionId}/registry/write`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async registryCreateKey(sessionId: string, req: import('@/types').RegistryCreateKeyRequest) {
    return this.request(`/sessions/${sessionId}/registry/create-key`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async registryDeleteKey(sessionId: string, req: import('@/types').RegistryDeleteKeyRequest) {
    return this.request(`/sessions/${sessionId}/registry/delete-key`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async registryDeleteValue(sessionId: string, req: import('@/types').RegistryDeleteValueRequest) {
    return this.request(`/sessions/${sessionId}/registry/delete-value`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async registryListSubkeys(sessionId: string, req: import('@/types').RegistryReadRequest) {
    return this.request<{ subkeys: string[] }>(`/sessions/${sessionId}/registry/list-subkeys`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async registryListValues(sessionId: string, req: import('@/types').RegistryReadRequest) {
    return this.request<{ values: import('@/types').RegistryValue[] }>(`/sessions/${sessionId}/registry/list-values`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // Extended privilege escalation
  async runAs(sessionId: string, req: import('@/types').RunAsRequest) {
    return this.request<{ pid: number }>(`/sessions/${sessionId}/runas`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async makeToken(sessionId: string, req: import('@/types').MakeTokenRequest) {
    return this.request<{ success: boolean }>(`/sessions/${sessionId}/make-token`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async rev2self(sessionId: string) {
    return this.request<{ success: boolean }>(`/sessions/${sessionId}/rev2self`, {
      method: 'POST',
    });
  }

  async getTokenInfo(sessionId: string) {
    return this.request<{ token: import('@/types').TokenInfo }>(`/sessions/${sessionId}/token-info`);
  }

  // Armory
  async getArmoryIndex() {
    return this.request<{ armory: import('@/types').ArmoryIndex }>('/armory');
  }

  async installArmoryPackage(name: string) {
    return this.request('/armory/install', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async uninstallArmoryPackage(name: string) {
    return this.request('/armory/uninstall', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async refreshArmory() {
    return this.request('/armory/refresh', { method: 'POST' });
  }

  // C2 Profiles
  async getC2Profiles() {
    return this.request<{ profiles: import('@/types').C2Profile[] }>('/c2profiles');
  }

  async getC2Profile(name: string) {
    return this.request<{ profile: import('@/types').C2Profile }>(`/c2profiles/${name}`);
  }

  async createC2Profile(profile: import('@/types').C2Profile) {
    return this.request('/c2profiles', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
  }

  async deleteC2Profile(name: string) {
    return this.request(`/c2profiles/${name}`, { method: 'DELETE' });
  }

  // Certificates
  async getCertificates() {
    return this.request<{ certificates: import('@/types').Certificate[] }>('/certificates');
  }

  async generateCertificate(type: string, commonName: string) {
    return this.request('/certificates/generate', {
      method: 'POST',
      body: JSON.stringify({ type, commonName }),
    });
  }

  async deleteCertificate(id: string) {
    return this.request(`/certificates/${id}`, { method: 'DELETE' });
  }

  // Canaries
  async getCanaries() {
    return this.request<{ canaries: import('@/types').Canary[] }>('/canaries');
  }

  // Dashboard
  async getDashboardStats() {
    return this.request<{ stats: import('@/types').DashboardStats }>('/dashboard/stats');
  }

  async getActivityFeed(limit = 20) {
    return this.request<{ events: import('@/types').ActivityEvent[] }>(`/dashboard/activity?limit=${limit}`);
  }

  // Pivot operations
  async getPivotListeners(sessionId: string) {
    return this.request<{ listeners: import('@/types').PivotListener[] }>(`/sessions/${sessionId}/pivots`);
  }

  async startPivotListener(sessionId: string, req: import('@/types').StartPivotListenerRequest) {
    return this.request<{ listener: import('@/types').PivotListener }>(`/sessions/${sessionId}/pivots`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async stopPivotListener(sessionId: string, listenerId: string) {
    return this.request(`/sessions/${sessionId}/pivots/${listenerId}`, { method: 'DELETE' });
  }

  async getPivotGraph() {
    return this.request<import('@/types').PivotGraph>('/pivots/graph');
  }

  // Network topology
  async getNetworkTopology() {
    return this.request<{
      nodes: import('@/types').TopologyNode[];
      edges: import('@/types').TopologyEdge[];
    }>('/topology');
  }

  // Cursed (Browser manipulation) operations
  async cursedListProcesses(sessionId: string) {
    return this.request<{ processes: import('@/types').CursedProcess[] }>(`/sessions/${sessionId}/cursed/processes`);
  }

  async cursedGetChrome(sessionId: string, pid: number) {
    return this.request<import('@/types').CursedChrome>(`/sessions/${sessionId}/cursed/chrome/${pid}`);
  }

  async cursedGetCookies(sessionId: string, pid: number, url?: string) {
    const query = url ? `?url=${encodeURIComponent(url)}` : '';
    return this.request<{ cookies: import('@/types').CursedCookie[] }>(`/sessions/${sessionId}/cursed/chrome/${pid}/cookies${query}`);
  }

  async cursedScreenshot(sessionId: string, pid: number, windowId: string) {
    return this.request<import('@/types').CursedScreenshot>(`/sessions/${sessionId}/cursed/chrome/${pid}/screenshot`, {
      method: 'POST',
      body: JSON.stringify({ windowId }),
    });
  }

  async cursedInjectJS(sessionId: string, pid: number, payload: import('@/types').CursedInjectPayload) {
    return this.request<{ result: string }>(`/sessions/${sessionId}/cursed/chrome/${pid}/inject`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async cursedKeylogger(sessionId: string, pid: number, req: import('@/types').CursedKeyloggerRequest) {
    return this.request(`/sessions/${sessionId}/cursed/chrome/${pid}/keylogger`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // Execute operations - Code Execution Framework
  async executeAssembly(sessionId: string, req: import('@/types').ExecuteAssemblyRequest) {
    return this.request<{ output: string }>(`/sessions/${sessionId}/execute-assembly`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async executeShellcode(sessionId: string, req: import('@/types').ExecuteShellcodeRequest) {
    return this.request<{ success: boolean }>(`/sessions/${sessionId}/execute-shellcode`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async migrate(sessionId: string, req: import('@/types').MigrateRequest) {
    return this.request<{ success: boolean; newSessionId?: string }>(`/sessions/${sessionId}/migrate`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async spawnDll(sessionId: string, req: import('@/types').SpawnDllRequest) {
    return this.request<{ output: string }>(`/sessions/${sessionId}/spawndll`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async sideload(sessionId: string, req: import('@/types').SideloadRequest) {
    return this.request<{ output: string }>(`/sessions/${sessionId}/sideload`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async msfStager(sessionId: string, req: import('@/types').MsfStagerRequest) {
    return this.request<{ data: string }>(`/sessions/${sessionId}/msf`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async msfInject(sessionId: string, pid: number, req: import('@/types').MsfStagerRequest) {
    return this.request<{ success: boolean }>(`/sessions/${sessionId}/msf-inject/${pid}`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // Screenshot operations
  async screenshot(sessionId: string) {
    return this.request<import('@/types').Screenshot>(`/sessions/${sessionId}/screenshot`, {
      method: 'POST',
    });
  }

  async listScreenshots(sessionId: string) {
    return this.request<{ screenshots: import('@/types').Screenshot[] }>(`/sessions/${sessionId}/screenshots`);
  }

  // Task operations
  async listTasks(sessionId: string, filter?: import('@/types').TaskFilter) {
    const query = filter ? `?state=${filter.state || ''}&type=${filter.type || ''}` : '';
    return this.request<{ tasks: import('@/types').Task[] }>(`/sessions/${sessionId}/tasks${query}`);
  }

  async cancelTask(sessionId: string, taskId: string) {
    return this.request(`/sessions/${sessionId}/tasks/${taskId}/cancel`, { method: 'POST' });
  }

  async getTaskResult(sessionId: string, taskId: string) {
    return this.request<import('@/types').Task>(`/sessions/${sessionId}/tasks/${taskId}`);
  }

  // Reaction operations - Event-triggered automation
  async getReactions() {
    return this.request<{ reactions: import('@/types').Reaction[] }>('/reactions');
  }

  async getReaction(id: string) {
    return this.request<{ reaction: import('@/types').Reaction }>(`/reactions/${id}`);
  }

  async createReaction(req: import('@/types').CreateReactionRequest) {
    return this.request<{ reaction: import('@/types').Reaction }>('/reactions', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async updateReaction(id: string, req: import('@/types').UpdateReactionRequest) {
    return this.request<{ reaction: import('@/types').Reaction }>(`/reactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(req),
    });
  }

  async deleteReaction(id: string) {
    return this.request(`/reactions/${id}`, { method: 'DELETE' });
  }

  async toggleReaction(id: string, enabled: boolean) {
    return this.request<{ reaction: import('@/types').Reaction }>(`/reactions/${id}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  }

  async testReaction(id: string) {
    return this.request<{ success: boolean; output?: string }>(`/reactions/${id}/test`, {
      method: 'POST',
    });
  }

  // SSH operations - Remote command execution through implant
  async sshExecute(sessionId: string, req: import('@/types').SSHCommandRequest) {
    return this.request<import('@/types').SSHCommandResult>(`/sessions/${sessionId}/ssh`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async beaconSshExecute(beaconId: string, req: import('@/types').SSHCommandRequest) {
    return this.request<{ task: import('@/types').BeaconTask }>(`/beacons/${beaconId}/ssh`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // TaskMany operations - Batch task execution
  async taskMany(req: import('@/types').TaskManyRequest) {
    return this.request<import('@/types').TaskManyResponse>('/taskmany', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async getTaskManyStatus(id: string) {
    return this.request<import('@/types').TaskManyResponse>(`/taskmany/${id}`);
  }

  async cancelTaskMany(id: string) {
    return this.request(`/taskmany/${id}/cancel`, { method: 'POST' });
  }

  async listTaskManyHistory() {
    return this.request<{ tasks: import('@/types').TaskManyResponse[] }>('/taskmany');
  }

  // ============ NEW API METHODS FOR MISSING FEATURES ============

  // Profiles API
  async getProfiles() {
    return this.request<{ profiles: import('@/types').ImplantProfile[] }>('/profiles');
  }

  async getProfile(name: string) {
    return this.request<{ profile: import('@/types').ImplantProfile }>(`/profiles/${name}`);
  }

  async createProfile(req: import('@/types').CreateProfileRequest) {
    return this.request<{ profile: import('@/types').ImplantProfile }>('/profiles', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async deleteProfile(name: string) {
    return this.request(`/profiles/${name}`, { method: 'DELETE' });
  }

  async generateFromProfile(name: string) {
    return this.request<{ implant: import('@/types').Implant }>(`/profiles/${name}/generate`, {
      method: 'POST',
    });
  }

  // Alias API
  async getAliases() {
    return this.request<{ aliases: import('@/types').Alias[] }>('/aliases');
  }

  async loadAlias(path: string) {
    return this.request<{ alias: import('@/types').Alias }>('/aliases/load', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  async installAlias(name: string) {
    return this.request('/aliases/install', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async removeAlias(name: string) {
    return this.request(`/aliases/${name}`, { method: 'DELETE' });
  }

  // Extensions API
  async getExtensions() {
    return this.request<{ extensions: import('@/types').Extension[] }>('/extensions');
  }

  async loadExtension(path: string) {
    return this.request<{ extension: import('@/types').Extension }>('/extensions/load', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  async installExtension(name: string) {
    return this.request('/extensions/install', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async removeExtension(name: string) {
    return this.request(`/extensions/${name}`, { method: 'DELETE' });
  }

  // Services API (Windows)
  async getServices(sessionId: string) {
    return this.request<{ services: import('@/types').WindowsService[] }>(`/sessions/${sessionId}/services`);
  }

  async getServiceInfo(sessionId: string, serviceName: string) {
    return this.request<{ service: import('@/types').WindowsService }>(`/sessions/${sessionId}/services/${serviceName}`);
  }

  async controlService(sessionId: string, req: import('@/types').ServiceControlRequest) {
    return this.request<{ success: boolean }>(`/sessions/${sessionId}/services/control`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // Procdump API
  async procdump(sessionId: string, req: import('@/types').ProcdumpRequest) {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}/sessions/${sessionId}/procdump`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Procdump failed' }));
      throw new Error(error.error || 'Procdump failed');
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `procdump_${req.pid}.dmp`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match) {
        filename = match[1];
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Extended file operations
  async moveFile(sessionId: string, req: import('@/types').MoveFileRequest) {
    return this.request<{ success: boolean }>(`/sessions/${sessionId}/mv`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async copyFile(sessionId: string, req: import('@/types').CopyFileRequest) {
    return this.request<{ success: boolean }>(`/sessions/${sessionId}/cp`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async grepFile(sessionId: string, req: import('@/types').GrepRequest) {
    return this.request<import('@/types').GrepResult>(`/sessions/${sessionId}/grep`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async headFile(sessionId: string, req: import('@/types').HeadTailRequest) {
    return this.request<import('@/types').HeadTailResult>(`/sessions/${sessionId}/head`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async tailFile(sessionId: string, req: import('@/types').HeadTailRequest) {
    return this.request<import('@/types').HeadTailResult>(`/sessions/${sessionId}/tail`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // File permission operations
  async chmod(sessionId: string, req: import('@/types').ChmodRequest) {
    return this.request<{ success: boolean }>(`/sessions/${sessionId}/chmod`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async chown(sessionId: string, req: import('@/types').ChownRequest) {
    return this.request<{ success: boolean }>(`/sessions/${sessionId}/chown`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async chtimes(sessionId: string, req: import('@/types').ChtimesRequest) {
    return this.request<{ success: boolean }>(`/sessions/${sessionId}/chtimes`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // Memory file operations
  async getMemfiles(sessionId: string) {
    return this.request<{ memfiles: import('@/types').Memfile[] }>(`/sessions/${sessionId}/memfiles`);
  }

  async createMemfile(sessionId: string, req?: import('@/types').CreateMemfileRequest) {
    return this.request<{ memfile: import('@/types').Memfile }>(`/sessions/${sessionId}/memfiles`, {
      method: 'POST',
      body: JSON.stringify(req || {}),
    });
  }

  async deleteMemfile(sessionId: string, fd: number) {
    return this.request(`/sessions/${sessionId}/memfiles/${fd}`, { method: 'DELETE' });
  }

  // Mount operations
  async getMounts(sessionId: string) {
    return this.request<{ mounts: import('@/types').MountInfo[] }>(`/sessions/${sessionId}/mount`);
  }

  // PsExec operations
  async psexec(sessionId: string, req: import('@/types').PsExecRequest) {
    return this.request<import('@/types').PsExecResult>(`/sessions/${sessionId}/psexec`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // Backdoor operations
  async backdoor(sessionId: string, req: import('@/types').BackdoorRequest) {
    return this.request<import('@/types').BackdoorResult>(`/sessions/${sessionId}/backdoor`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // DLL Hijack operations
  async dllHijack(sessionId: string, req: import('@/types').DllHijackRequest) {
    return this.request<import('@/types').DllHijackResult>(`/sessions/${sessionId}/dll-hijack`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // Reconfig operations
  async reconfig(sessionId: string, req: import('@/types').ReconfigRequest) {
    return this.request<{ success: boolean }>(`/sessions/${sessionId}/reconfig`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async reconfigBeacon(beaconId: string, req: import('@/types').ReconfigRequest) {
    return this.request<{ task: import('@/types').BeaconTask }>(`/beacons/${beaconId}/reconfig`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // Ping operations
  async ping(sessionId: string) {
    return this.request<import('@/types').PingResult>(`/sessions/${sessionId}/ping`, {
      method: 'POST',
    });
  }

  // Crack operations
  async getCrackStations() {
    return this.request<{ stations: import('@/types').CrackStation[] }>('/crack/stations');
  }

  async getWordlists() {
    return this.request<{ wordlists: import('@/types').Wordlist[] }>('/crack/wordlists');
  }

  async uploadWordlist(file: File) {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/crack/wordlists`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async deleteWordlist(id: string) {
    return this.request(`/crack/wordlists/${id}`, { method: 'DELETE' });
  }

  async getCrackRules() {
    return this.request<{ rules: import('@/types').CrackRule[] }>('/crack/rules');
  }

  async uploadCrackRule(file: File) {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/crack/rules`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async deleteCrackRule(id: string) {
    return this.request(`/crack/rules/${id}`, { method: 'DELETE' });
  }

  async getHcstat2Files() {
    return this.request<{ hcstat2: import('@/types').Hcstat2[] }>('/crack/hcstat2');
  }

  async uploadHcstat2(file: File) {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/crack/hcstat2`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async deleteHcstat2(id: string) {
    return this.request(`/crack/hcstat2/${id}`, { method: 'DELETE' });
  }

  async getCrackJobs() {
    return this.request<{ jobs: import('@/types').CrackJob[] }>('/crack/jobs');
  }

  async startCrackJob(req: import('@/types').StartCrackJobRequest) {
    return this.request<{ job: import('@/types').CrackJob }>('/crack/jobs', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async cancelCrackJob(id: string) {
    return this.request(`/crack/jobs/${id}/cancel`, { method: 'POST' });
  }

  // Traffic encoder operations
  async getTrafficEncoders() {
    return this.request<{ encoders: import('@/types').TrafficEncoder[] }>('/traffic-encoders');
  }

  async addTrafficEncoder(req: import('@/types').AddTrafficEncoderRequest) {
    return this.request<{ encoder: import('@/types').TrafficEncoder }>('/traffic-encoders', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async deleteTrafficEncoder(id: string) {
    return this.request(`/traffic-encoders/${id}`, { method: 'DELETE' });
  }

  // Clean operations
  async clean(req: import('@/types').CleanRequest) {
    return this.request<{ success: boolean; deleted: Record<string, number> }>('/clean', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // License operations
  async getLicenses() {
    return this.request<{ licenses: import('@/types').License[] }>('/licenses');
  }

  // Update operations
  async checkUpdate() {
    return this.request<import('@/types').UpdateInfo>('/update/check');
  }

  // Regenerate implant
  async regenerateImplant(name: string) {
    return this.request<{ implant: import('@/types').Implant }>(`/implants/${encodeURIComponent(name)}/regenerate`, {
      method: 'POST',
    });
  }

  // Compiler info
  async getCompilerInfo() {
    return this.request<import('@/types').CompilerInfo>('/compiler/info');
  }

  // Host IOC management
  async getHostIOCs(hostId: string) {
    return this.request<{ iocs: import('@/types').IOC[] }>(`/hosts/${hostId}/iocs`);
  }

  async addHostIOC(hostId: string, ioc: import('@/types').CreateIOCRequest) {
    return this.request<{ ioc: import('@/types').IOC }>(`/hosts/${hostId}/iocs`, {
      method: 'POST',
      body: JSON.stringify(ioc),
    });
  }

  async deleteHostIOC(hostId: string, iocId: string) {
    return this.request<void>(`/hosts/${hostId}/iocs/${iocId}`, {
      method: 'DELETE',
    });
  }

  // Session info commands
  async getPid(sessionId: string) {
    return this.request<{ pid: number }>(`/sessions/${sessionId}/getpid`);
  }

  async getUid(sessionId: string) {
    return this.request<{ uid: string; gid: string }>(`/sessions/${sessionId}/getuid`);
  }

  // WASM execution
  async executeWasm(sessionId: string, req: import('@/types').WasmExecRequest) {
    return this.request<import('@/types').WasmExecResponse>(`/sessions/${sessionId}/wasm`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // Beacon watch (get beacon with extended info for monitoring)
  async watchBeacon(beaconId: string) {
    return this.request<{ beacon: import('@/types').Beacon; tasks: import('@/types').BeaconTask[] }>(
      `/beacons/${beaconId}/watch`
    );
  }
}

export const api = new ApiClient();
export default api;
