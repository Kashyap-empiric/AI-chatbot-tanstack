export interface AIAdapter {
    generate(input: { model: string; messages: AIMessage[] }): Promise<{
        text: string;
        modelVersion?: string | null;
        model?: string;
        provider?: string;
    }>;

    stream(input: {
        model: string;
        messages: AIMessage[];
        signal?: AbortSignal;
    }): AsyncGenerator<AIStreamChunk>;
}

export type AIMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

export type AIStreamChunk =
    | {
          type: "meta";
          model?: string;
          modelVersion?: string | null;
          provider?: string;
      }
    | {
          type: "delta";
          text: string;
      }
    | {
          type: "done";
          finishReason?: string;
          truncated?: boolean;
      }
    | {
          type: "error";
          error: string;
      }
    | {
          type: "aborted";
      };
