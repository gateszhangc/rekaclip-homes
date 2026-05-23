export type LoginExecStartOptions = {
  signal: AbortSignal;
  onData: (chunk: string) => void;
  onExit: (exitCode: number | null) => void;
  onError?: (error: unknown) => void;
};

export interface LoginExecAdapter {
  start(options: LoginExecStartOptions): Promise<void>;
}
