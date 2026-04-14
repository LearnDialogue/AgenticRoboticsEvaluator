"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    createUnityInstance?: (
      canvas: HTMLCanvasElement,
      config: {
        dataUrl: string;
        frameworkUrl: string;
        codeUrl: string;
        streamingAssetsUrl?: string;
        companyName?: string;
        productName?: string;
        productVersion?: string;
        errorHandler?: (message: string, filename?: string, line?: number) => boolean | void;
        startupErrorHandler?: (message: string, filename?: string, line?: number) => void;
        showBanner?: (message: string, type?: string) => void;
      },
      onProgress?: (progress: number) => void
    ) => Promise<{
      Quit?: () => Promise<void>;
      SendMessage?: (gameObject: string, methodName: string, parameter?: string) => void;
    }>;
    unityAvatarBridge?: {
      sendState: (state: string) => void;
      sendUserMessage: (message: string) => void;
      sendAssistantMessage: (message: string) => void;
    };
  }
}

const LOADER_URL = "/unity-avatar/Build/WebGL_Build.loader.js";
const BUILD_BASE = "/unity-avatar/Build";

export default function UnityAvatarPanel() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const unityInstanceRef = useRef<{
    Quit?: () => Promise<void>;
  } | null>(null);

  const [status, setStatus] = useState("Loading avatar...");
  const [progress, setProgress] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadUnity = async () => {
      if (!canvasRef.current) return;

      try {
        const existingScript = document.querySelector(
          `script[src="${LOADER_URL}"]`
        ) as HTMLScriptElement | null;

        const loaderScript =
          existingScript ??
          Object.assign(document.createElement("script"), {
            src: LOADER_URL,
            async: true,
          });

        scriptRef.current = loaderScript;

        if (!existingScript) {
          await new Promise<void>((resolve, reject) => {
            loaderScript.onload = () => resolve();
            loaderScript.onerror = () => reject(new Error("Failed to load Unity loader."));
            document.body.appendChild(loaderScript);
          });
        }

        if (!window.createUnityInstance) {
          throw new Error("Unity loader is available, but createUnityInstance was not found.");
        }

        const instance = await window.createUnityInstance(
          canvasRef.current,
          {
            dataUrl: `${BUILD_BASE}/WebGL_Build.data`,
            frameworkUrl: `${BUILD_BASE}/WebGL_Build.framework.js`,
            codeUrl: `${BUILD_BASE}/WebGL_Build.wasm`,
            companyName: "UF Senior Project",
            productName: "Pedagogical Avatar",
            productVersion: "1.0",
            errorHandler: (message: string) => {
              console.error("Unity runtime error:", message);
              setHasError(true);
              setErrorMessage(message);
              setStatus("Avatar build could not be loaded.");
              return true;
            },
            startupErrorHandler: (message: string) => {
              console.error("Unity startup error:", message);
              setHasError(true);
              setErrorMessage(message);
              setStatus("Avatar build could not be loaded.");
            },
            showBanner: (message: string, type?: string) => {
              if (type === "error" || type === "warning") {
                console[type === "error" ? "error" : "warn"]("Unity banner:", message);
              }
            },
          },
          (nextProgress) => {
            if (cancelled) return;
            setProgress(nextProgress);
            setStatus(nextProgress < 1 ? "Loading avatar..." : "Avatar ready");
          }
        );

        if (cancelled) {
          await instance.Quit?.();
          return;
        }

        unityInstanceRef.current = instance;
        window.unityAvatarBridge = {
          sendState: (state: string) => {
            instance.SendMessage?.("ChatLLM", "SetState", state);
          },
          sendUserMessage: (message: string) => {
            instance.SendMessage?.("ChatLLM", "OnUserMessage", message);
          },
          sendAssistantMessage: (message: string) => {
            instance.SendMessage?.("ChatLLM", "OnAssistantMessage", message);
          },
        };
        setHasError(false);
        setErrorMessage("");
      } catch (error) {
        console.error("Failed to load Unity avatar:", error);
        if (!cancelled) {
          setHasError(true);
          setErrorMessage(error instanceof Error ? error.message : String(error));
          setStatus("Avatar build could not be loaded.");
        }
      }
    };

    loadUnity();

    return () => {
      cancelled = true;
      delete window.unityAvatarBridge;
      void unityInstanceRef.current?.Quit?.();
      unityInstanceRef.current = null;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Pedagogical Avatar</h2>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
            hasError
              ? "bg-red-100 text-red-700"
              : progress >= 1
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="relative bg-slate-950">
        <canvas
          ref={canvasRef}
          id="unity-avatar-canvas"
          tabIndex={0}
          className="block h-[320px] w-full bg-transparent md:h-[380px]"
        />

        {progress < 1 && !hasError && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 px-6 text-center">
            <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="text-sm text-slate-200">{Math.round(progress * 100)}%</p>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/85 px-6 text-center">
            <div className="max-w-md space-y-2">
              <p className="text-sm text-slate-200">
                The Unity build was found, but the browser could not start it.
              </p>
              {errorMessage && (
                <pre className="whitespace-pre-wrap rounded border border-slate-700 bg-slate-900/80 p-3 text-left text-xs text-rose-200">
                  {errorMessage}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
