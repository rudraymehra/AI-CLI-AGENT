export type AgentStep = {
  step: "START" | "THINK" | "TOOL" | "OBSERVE" | "OUTPUT";
  content: string;
  tool_name?: string;
  tool_args?: string;
};

export type Turn = {
  role: "user" | "model";
  parts: { text: string }[];
};
