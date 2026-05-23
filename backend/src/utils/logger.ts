import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

// 创建 Pino 日志实例
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // 生产环境：JSON 格式，便于日志收集系统解析
  // 开发环境：美观格式
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      },
  // 确保日志输出到 stdout/stderr
  formatters: {
    level: (label) => ({ level: label }),
  },
});

// 部署专用日志（带 deploymentId 上下文）
export const deployLogger = (deploymentId: string) =>
  logger.child({ deploymentId, component: "deploy" });

// Docker 专用日志
export const dockerLogger = logger.child({ component: "docker" });

// 请求日志中间件
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(
      {
        req: {
          method: req.method,
          url: req.url,
          userAgent: req.get("user-agent"),
        },
        res: {
          statusCode: res.statusCode,
        },
        duration,
      },
      `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`
    );
  });
  
  next();
};
