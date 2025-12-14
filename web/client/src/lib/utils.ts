import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString();
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function getOSIcon(os: string): string {
  const lower = os.toLowerCase();
  if (lower.includes('windows')) return '🪟';
  if (lower.includes('linux')) return '🐧';
  if (lower.includes('darwin') || lower.includes('macos')) return '🍎';
  return '💻';
}

export function getTransportColor(transport: string): string {
  switch (transport.toLowerCase()) {
    case 'mtls':
      return 'text-green-500';
    case 'http':
    case 'https':
      return 'text-blue-500';
    case 'dns':
      return 'text-purple-500';
    case 'wg':
      return 'text-orange-500';
    default:
      return 'text-gray-500';
  }
}
