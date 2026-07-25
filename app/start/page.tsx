"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-jakarta",
});

const COLOR = {
  black: "#0A0A0A",
  gold: "#F5C842",
  orange: "#E8881A",
  charcoal: "#1A1A1A",
  midGray: "#888786",
  green: "#22C55E",
};

interface QueuedFile {
  file: File;
  localId: string;
}

interface PendingSection {
  sectionLocalId: string;
  name: string;
  mediaType: "PHOTO" | "VIDEO";
  files: QueuedFile[];
}

type FileStatus = "pending" | "uploading" | "done" | "error";
type BuilderStep = "closed" | "type" | "details";
type Phase = "form" | "auth" | "verify" | "uploading" | "done";

const CODE_WORDS = [
  "sunrise", "harbor", "velvet", "cobalt", "willow", "ember",
  "quartz", "meadow", "cipher", "lantern", "orbit", "maple",
];

function suggestCode() {
  const word = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
  const number = Math.floor(10 + Math.random() * 90);
  return `${word}${number}`;
}

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (loaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

export default function StartPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("form");

  const [clientName, setClientName] = useState("");
  const [password, setPassword] = useState("");
  const [tagline, setTagline] = useState("");
  const [heroLocalId, setHeroLocalId] = useState<string | null>(null);

  const [sections, setSections] = useState<PendingSection[]>([]);
  const [builderStep, setBuilderStep] = useState<BuilderStep>("closed");
  const [builderType, setBuilderType] = useState<"PHOTO" | "VIDEO" | null>(null);
  const [builderName, setBuilderName] = useState("");
  const [builderFiles, setBuilderFiles] = useState<QueuedFile[]>([]);
  const builderFileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const [statusMap, setStatusMap] = useState<Record<string, FileStatus>>({});
  const [loadedMap, setLoadedMap] = useState<Record<string, number>>({});

  // ── section builder logic ──
  const startBuilder = () => {
    setBuilderStep("type");
    setBuilderType(null);
    setBuilderName("");
    setBuilderFiles([]);
  };

  const chooseBuilderType = (type: "PHOTO" | "VIDEO") => {
    setBuilderType(type);
    setBuilderStep("details");
  };

  const handleBuilderFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).map((file) => ({
      file,
      localId: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
    }));
    setBuilderFiles(selected);
  };

  const confirmSection = () => {
    if (!builderType) return;
    if (!builderName.trim()) {
      setError("Give this section a name");
      return;
    }
    if (builderFiles.length === 0) {
      setError("Choose at least one file");
      return;
    }
    setError(null);

    const newSection: PendingSection = {
      sectionLocalId: `section-${Math.random().toString(36).slice(2)}`,
      name: builderName.trim(),
      mediaType: builderType,
      files: builderFiles,
    };

    setSections((prev) => {
      const next = [...prev, newSection];
      if (!heroLocalId) setHeroLocalId(newSection.files[0].localId);
      return next;
    });

    setBuilderStep("closed");
    setBuilderType(null);
    setBuilderName("");
    setBuilderFiles([]);
    if (builderFileInputRef.current) builderFileInputRef.current.value = "";
  };

  const cancelBuilder = () => {
    setBuilderStep("closed");
    setBuilderType(null);
    setBuilderName("");
    setBuilderFiles([]);
    setError(null);
  };

  const removeSection = (sectionLocalId: string) => {
    setSections((prev) => {
      const removed = prev.find((s) => s.sectionLocalId === sectionLocalId);
      const next = prev.filter((s) => s.sectionLocalId !== sectionLocalId);
      if (removed && removed.files.some((f) => f.localId === heroLocalId)) {
        const firstRemaining = next.flatMap((s) => s.files)[0];
        setHeroLocalId(firstRemaining ? firstRemaining.localId : null);
      }
      return next;
    });
  };

  const anyVideoSection = sections.some((s) => s.mediaType === "VIDEO" && s.files.length > 0);
  const allFilesForPreview = sections.flatMap((s) => s.files);
  const previewFileKey = allFilesForPreview.map((f) => f.localId).join(",");

  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const newUrls: Record<string, string> = {};
    allFilesForPreview.forEach((f) => {
      newUrls[f.localId] = URL.createObjectURL(f.file);
    });
    setPreviewUrls(newUrls);
    return () => {
      Object.values(newUrls).forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewFileKey]);
  const allFiles = sections.flatMap((s) => s.files);
  const totalBytes = allFiles.reduce((sum, f) => sum + f.file.size, 0);
  const loadedBytes = allFiles.reduce((sum, f) => sum + (loadedMap[f.localId] ?? 0), 0);
  const overallPercent = totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0;
  const doneCount = allFiles.filter((f) => statusMap[f.localId] === "done").length;

  // The actual "does an account exist yet" gate. Called first when the
  // form is submitted — if it comes back 401, nothing was lost: every
  // field the person already filled in stays exactly where it is, and
  // we just switch into the auth phase to collect the missing piece.
  const attemptCreateProject = async (): Promise<{ id: string } | null> => {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientName, password }),
    });

    if (res.status === 401) return null;

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to create project");
    }
    const { project } = await res.json();
    return project;
  };

  const runUpload = async (project: { id: string }) => {
    setPhase("uploading");
    setStatusMap(Object.fromEntries(allFiles.map((f) => [f.localId, "pending" as FileStatus])));
    setLoadedMap({});

    let heroMediaId: string | null = null;

    for (const section of sections) {
      const sectionRes = await fetch(`/api/projects/${project.id}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: section.name, mediaType: section.mediaType }),
      });
      if (!sectionRes.ok) {
        const data = await sectionRes.json();
        throw new Error(data.error ?? "Couldn't create section");
      }
      const { section: createdSection } = await sectionRes.json();

      for (const { file, localId } of section.files) {
        setStatusMap((prev) => ({ ...prev, [localId]: "uploading" }));
        try {
          const presignRes = await fetch("/api/upload/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: project.id,
              filename: file.name,
              contentType: file.type,
              fileSizeMb: file.size / (1024 * 1024),
            }),
          });
          if (!presignRes.ok) {
            const data = await presignRes.json();
            throw new Error(data.error ?? "presign failed");
          }
          const { uploadUrl, fileKey } = await presignRes.json();

          await uploadWithProgress(uploadUrl, file, (loaded) => {
            setLoadedMap((prev) => ({ ...prev, [localId]: loaded }));
          });

          const completeRes = await fetch("/api/upload/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: project.id,
              fileKey,
              type: section.mediaType,
              sectionId: createdSection.id,
            }),
          });
          if (!completeRes.ok) throw new Error("failed to save media record");
          const { media } = await completeRes.json();

          if (localId === heroLocalId) heroMediaId = media.id;
          setStatusMap((prev) => ({ ...prev, [localId]: "done" }));
          setLoadedMap((prev) => ({ ...prev, [localId]: file.size }));
        } catch (err) {
          setStatusMap((prev) => ({ ...prev, [localId]: "error" }));
          throw err;
        }
      }
    }

    if (heroMediaId || tagline) {
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(heroMediaId ? { heroMediaId } : {}),
          ...(tagline ? { heroTagline: tagline } : {}),
        }),
      });
    }

    setPhase("done");
    setTimeout(() => router.push(`/dashboard/${project.id}`), 900);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientName || !password) {
      setError("Client name and an access code are required");
      return;
    }

    setLoading(true);
    try {
      const project = await attemptCreateProject();
      if (project) {
        await runUpload(project);
      } else {
        setPhase("auth");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (authMode === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: authPassword }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Invalid email or password");
        }
        const project = await attemptCreateProject();
        if (!project) throw new Error("Something went wrong signing you in");
        await runUpload(project);
      } else {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: authPassword, name, phone }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Something went wrong");
        }
        setPhase("verify");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Invalid code");
      }
      const project = await attemptCreateProject();
      if (!project) throw new Error("Something went wrong finishing signup");
      await runUpload(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendStatus("Sending...");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: authPassword, name, phone }),
    });
    setResendStatus(res.ok ? "New code sent" : "Couldn't resend — try again");
    setTimeout(() => setResendStatus(null), 3000);
  };

  // ─────────────────────────────────────────────
  // UPLOAD PROGRESS SCREEN
  // ─────────────────────────────────────────────
  if (phase === "uploading" || phase === "done") {
    return (
      <main
        className={`${jakarta.variable} flex min-h-screen items-center justify-center px-6`}
        style={{ background: COLOR.black, fontFamily: "var(--font-jakarta)" }}
      >
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <p className="mb-3 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
              {phase === "done" ? "All set" : "Uploading your project"}
            </p>
            <h1 className="text-2xl font-bold text-white md:text-3xl">
              {phase === "done" ? "Everything's in place." : `${doneCount} of ${allFiles.length} files sent`}
            </h1>
          </div>

          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-white/50">
              <span>{phase === "done" ? "Complete" : "Overall progress"}</span>
              <span>{phase === "done" ? "100%" : `${overallPercent}%`}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${phase === "done" ? 100 : overallPercent}%`, background: phase === "done" ? COLOR.green : COLOR.gold }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {sections.map((section) => (
              <div key={section.sectionLocalId}>
                <p className="mb-1.5 text-xs font-semibold uppercase text-white/40">
                  {section.mediaType === "VIDEO" ? "🎬" : "🖼️"} {section.name}
                </p>
                <div className="flex flex-col gap-2">
                  {section.files.map((f) => {
                    const status = statusMap[f.localId] ?? "pending";
                    const loaded = loadedMap[f.localId] ?? 0;
                    const percent = f.file.size > 0 ? Math.round((loaded / f.file.size) * 100) : 0;
                    const isDone = status === "done" || phase === "done";
                    const isError = status === "error";
                    return (
                      <div key={f.localId} className="rounded-lg p-3.5" style={{ background: COLOR.charcoal }}>
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="max-w-[220px] truncate text-white/70">{f.file.name}</span>
                          <span className="flex items-center gap-1.5 font-medium">
                            {isDone ? (
                              <span style={{ color: COLOR.green }}>✓ Done</span>
                            ) : isError ? (
                              <span className="text-red-400">Failed</span>
                            ) : (
                              <span className="text-white/50">{percent}%</span>
                            )}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full transition-all duration-200 ease-out"
                            style={{ width: `${isDone ? 100 : isError ? 100 : percent}%`, background: isDone ? COLOR.green : isError ? "#f87171" : COLOR.gold }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {error && <p className="mt-6 text-center text-xs text-red-400">{error}</p>}
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────
  // AUTH GATE — reached only once they try to actually upload
  // ─────────────────────────────────────────────
  if (phase === "auth" || phase === "verify") {
    return (
      <main
        className={`${jakarta.variable} relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12`}
        style={{ background: COLOR.black, fontFamily: "var(--font-jakarta)" }}
      >
        <div
          className="pointer-events-none fixed inset-0"
          style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,200,66,0.05) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 w-full max-w-sm">
          {phase === "auth" ? (
            <>
              <div className="mb-8 text-center">
                <p className="mb-3 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
                  Almost there
                </p>
                <h1 className="text-2xl font-bold text-white md:text-3xl">
                  {authMode === "signup" ? "One quick account, then we upload" : "Log in to continue"}
                </h1>
                <p className="mt-2 text-sm font-normal text-white/50">
                  &ldquo;{clientName}&rdquo; is ready — just need to know where to save it.
                </p>
              </div>

              <form
                onSubmit={handleAuthSubmit}
                className="flex flex-col gap-4 rounded-2xl p-8"
                style={{ background: "rgba(26,26,26,0.7)", backdropFilter: "blur(16px)", border: "1px solid rgba(248,247,244,0.08)" }}
              >
                <div className="mb-1 h-[3px] w-8" style={{ background: COLOR.orange }} aria-hidden />

                {authMode === "signup" && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
                      Your name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ada Obi"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@studio.com"
                    style={{ fontSize: "16px" }}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
                  />
                </div>

                {authMode === "signup" && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
                      Phone number
                    </label>
                    <input
                      type="tel"
                      required
                      pattern="^\+234\d{10}$"
                      title="Enter a Nigerian number in the format +2348012345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+2348012345678"
                      style={{ fontSize: "16px" }}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
                    />
                    <p className="mt-1 text-xs text-white/30">Format: +234 followed by 10 digits</p>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={authMode === "signup" ? 8 : undefined}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder={authMode === "signup" ? "Minimum 8 characters" : "Your password"}
                    style={{ fontSize: "16px" }}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
                  />
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 rounded-lg py-3.5 text-sm font-semibold transition-transform hover:scale-[1.01] disabled:opacity-50"
                  style={{ background: COLOR.gold, color: COLOR.black }}
                >
                  {loading ? "Please wait..." : authMode === "signup" ? "Create account & continue" : "Log in & continue"}
                </button>

                <p className="text-center text-xs" style={{ color: COLOR.midGray }}>
                  {authMode === "signup" ? (
                    <>Already have an account?{" "}
                      <button type="button" onClick={() => setAuthMode("login")} className="font-medium text-white/70 underline hover:text-white">
                        Log in
                      </button>
                    </>
                  ) : (
                    <>No account yet?{" "}
                      <button type="button" onClick={() => setAuthMode("signup")} className="font-medium text-white/70 underline hover:text-white">
                        Sign up
                      </button>
                    </>
                  )}
                </p>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8 text-center">
                <p className="mb-3 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
                  Check your email
                </p>
                <h1 className="text-2xl font-bold text-white md:text-3xl">Enter your code</h1>
                <p className="mt-2 text-sm font-normal text-white/50">
                  We sent a 6-digit code to <span className="text-white/80">{email}</span>
                </p>
              </div>

              <form
                onSubmit={handleVerifySubmit}
                className="flex flex-col gap-4 rounded-2xl p-8"
                style={{ background: "rgba(26,26,26,0.7)", backdropFilter: "blur(16px)", border: "1px solid rgba(248,247,244,0.08)" }}
              >
                <div className="mb-1 h-[3px] w-8" style={{ background: COLOR.orange }} aria-hidden />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  style={{ fontSize: "24px", letterSpacing: "0.3em" }}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-center font-semibold text-white outline-none transition-colors focus:border-white/25"
                />
                {error && <p className="text-center text-xs text-red-400">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="mt-2 rounded-lg py-3.5 text-sm font-semibold transition-transform hover:scale-[1.01] disabled:opacity-50"
                  style={{ background: COLOR.gold, color: COLOR.black }}
                >
                  {loading ? "Verifying..." : "Verify & upload"}
                </button>
                <div className="flex items-center justify-between text-xs" style={{ color: COLOR.midGray }}>
                  <button type="button" onClick={() => setPhase("auth")} className="underline hover:text-white">
                    Change email
                  </button>
                  <button type="button" onClick={handleResend} className="underline hover:text-white">
                    {resendStatus ?? "Resend code"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────
  // FORM — the guest starting point, no account needed yet
  // ─────────────────────────────────────────────
  return (
    <main className={`${jakarta.variable} relative min-h-screen`} style={{ background: COLOR.black, fontFamily: "var(--font-jakarta)" }}>
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,200,66,0.05) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="inline-flex items-baseline gap-2">
            <span className="text-sm font-bold text-white">Show<span style={{ color: COLOR.gold }}>work</span></span>
          </Link>
          <Link
            href="/dashboard/billing"
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors hover:opacity-80"
            style={{ background: "rgba(245,200,66,0.15)", color: COLOR.gold }}
          >
            Upgrade
          </Link>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
          New delivery
        </p>
        <h1 className="mb-2 text-3xl font-bold text-white">Set up this project</h1>
        <p className="mb-10 text-sm text-white/40">
          No account needed yet — just start. We'll only ask for one right before you upload.
        </p>

        <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
          <div className="rounded-xl p-6" style={{ background: COLOR.charcoal }}>
            <div className="mb-5 h-[3px] w-8" style={{ background: COLOR.orange }} aria-hidden />
            <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
              Client name
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Soundhous"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
            />
          </div>

          <div className="rounded-xl p-6" style={{ background: "rgba(245,200,66,0.06)", border: "1px solid rgba(245,200,66,0.25)" }}>
            <div className="mb-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="7" width="10" height="7" rx="1.5" stroke={COLOR.gold} strokeWidth="1.4" />
                <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke={COLOR.gold} strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <h2 className="text-sm font-semibold text-white">Client access code</h2>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-white/50">
              This is the code your client will type in to unlock this delivery. Without it, no one can view the files — even if they have the link.
            </p>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
              Access code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="e.g. sunrise42"
                style={{ fontSize: "16px" }}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
              />
              <button
                type="button"
                onClick={() => setPassword(suggestCode())}
                className="flex-shrink-0 whitespace-nowrap rounded-lg px-3.5 py-3 text-xs font-semibold transition-colors hover:opacity-80"
                style={{ background: "rgba(245,200,66,0.15)", color: COLOR.gold }}
              >
                🎲 Suggest
              </button>
            </div>
          </div>

          <div className="rounded-xl p-6" style={{ background: COLOR.charcoal }}>
            <div className="mb-5 h-[3px] w-8" style={{ background: COLOR.orange }} aria-hidden />
            <label className="mb-1.5 block text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
              Banner headline <span className="normal-case text-white/25">(optional)</span>
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Three months of work. One night to remember."
              maxLength={80}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
            />
          </div>

          {/* SECTIONS */}
          <div className="rounded-xl p-6" style={{ background: COLOR.charcoal }}>
            <div className="mb-5 flex items-center gap-2">
              <div className="h-[3px] w-8" style={{ background: COLOR.orange }} aria-hidden />
              <label className="text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
                Sections{sections.length > 0 ? ` (${sections.length})` : ""}
              </label>
            </div>

            {sections.length > 0 && (
              <div className="mb-4 flex flex-col gap-2">
                {sections.map((section) => (
                  <div
                    key={section.sectionLocalId}
                    className="flex items-center justify-between rounded-lg px-3.5 py-2.5"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <span className="text-sm text-white/80">
                      {section.mediaType === "VIDEO" ? "🎬" : "🖼️"} {section.name}
                      <span className="ml-2 text-xs text-white/30">
                        {section.files.length} file{section.files.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSection(section.sectionLocalId)}
                      className="text-xs text-white/40 hover:text-white"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {builderStep === "closed" && sections.length === 0 && (
              <button
                type="button"
                onClick={startBuilder}
                className="flex w-full flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-6 py-6 text-center transition-colors hover:border-white/30"
                style={{ borderColor: "rgba(245,200,66,0.3)", background: "rgba(245,200,66,0.04)" }}
              >
                <span className="text-sm font-semibold" style={{ color: COLOR.gold }}>
                  + Add your first section
                </span>
                <span className="max-w-sm text-xs text-white/40">
                  A section is whatever you're delivering — "Room Renders," "Logo Concepts," "Ceremony Highlights." Add as many as this project needs.
                </span>
              </button>
            )}

            {builderStep === "closed" && sections.length > 0 && (
              <button
                type="button"
                onClick={startBuilder}
                className="flex w-full items-center justify-center gap-2 rounded-lg px-6 py-4 text-sm font-semibold transition-transform hover:scale-[1.01]"
                style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.3)" }}
              >
                + Have something else to include? Add a different section
              </button>
            )}

            {builderStep === "type" && (
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold text-white/70">What are you uploading?</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => chooseBuilderType("PHOTO")}
                    className="flex flex-col items-center gap-2 rounded-xl border-2 px-6 py-8 text-center transition-colors hover:border-white/25 hover:bg-white/[0.06]"
                    style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <span className="text-3xl">🖼️</span>
                    <span className="text-sm font-semibold text-white">Images</span>
                    <span className="text-xs text-white/40">Photos, renders, mockups</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseBuilderType("VIDEO")}
                    className="flex flex-col items-center gap-2 rounded-xl border-2 px-6 py-8 text-center transition-colors hover:border-white/25 hover:bg-white/[0.06]"
                    style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <span className="text-3xl">🎬</span>
                    <span className="text-sm font-semibold text-white">Videos</span>
                    <span className="text-xs text-white/40">Films, walkthroughs, reels</span>
                  </button>
                </div>
                <button type="button" onClick={cancelBuilder} className="text-left text-xs text-white/40 underline">
                  Cancel
                </button>
              </div>
            )}

            {builderStep === "details" && (
              <div className="flex flex-col gap-3 rounded-lg p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
                <p className="text-xs font-semibold text-white/70">
                  {builderType === "VIDEO" ? "🎬 Videos" : "🖼️ Images"} — name this section
                </p>
                <input
                  type="text"
                  value={builderName}
                  onChange={(e) => setBuilderName(e.target.value)}
                  placeholder={builderType === "VIDEO" ? "e.g. Ceremony Highlights" : "e.g. Room Renders"}
                  style={{ fontSize: "16px" }}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
                />

                <input
                  ref={builderFileInputRef}
                  type="file"
                  multiple
                  accept={builderType === "VIDEO" ? "video/mp4,video/quicktime" : "image/jpeg,image/png,image/webp"}
                  onChange={handleBuilderFileSelect}
                  className="hidden"
                  id="start-builder-files"
                />
                <label
                  htmlFor="start-builder-files"
                  className="cursor-pointer rounded-lg border border-dashed border-white/15 px-3 py-3 text-center text-xs text-white/50 hover:border-white/25"
                >
                  {builderFiles.length > 0
                    ? `${builderFiles.length} file${builderFiles.length === 1 ? "" : "s"} selected — click to change`
                    : "Choose files"}
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={confirmSection}
                    className="rounded-lg px-4 py-2.5 text-sm font-semibold"
                    style={{ background: COLOR.gold, color: COLOR.black }}
                  >
                    ✓ Save section
                  </button>
                  <button type="button" onClick={cancelBuilder} className="text-xs text-white/40 underline">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CHOOSE YOUR BANNER — its own dedicated, unmissable card */}
          {allFiles.length > 0 && (
            <div className="rounded-xl p-6" style={{ background: COLOR.charcoal }}>
              <div className="mb-2 flex items-center gap-2">
                <div className="h-[3px] w-8" style={{ background: COLOR.orange }} aria-hidden />
                <label className="text-xs font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>
                  Choose your banner
                </label>
              </div>
              <p className="mb-5 text-xs text-white/50">
                {anyVideoSection
                  ? "This is the first thing your client sees when they open the link. A video is always used as the banner — tap one below to choose which."
                  : "This is the first thing your client sees when they open the link. Tap a photo below to lead with it."}
              </p>

              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {sections.map((section) =>
                  section.files.map((f) => {
                    const selectable = !anyVideoSection || section.mediaType === "VIDEO";
                    const isSelected = f.localId === heroLocalId;
                    const previewUrl = previewUrls[f.localId];
                    return (
                      <button
                        key={f.localId}
                        type="button"
                        disabled={!selectable}
                        onClick={() => setHeroLocalId(f.localId)}
                        className="relative aspect-square overflow-hidden rounded-lg bg-black/40 transition-all disabled:cursor-not-allowed disabled:opacity-30"
                        style={{
                          border: isSelected ? `2px solid ${COLOR.gold}` : "2px solid rgba(255,255,255,0.08)",
                          boxShadow: isSelected ? "0 0 0 3px rgba(245,200,66,0.2)" : undefined,
                        }}
                      >
                        {previewUrl && (
                          section.mediaType === "VIDEO" ? (
                            <video src={previewUrl} muted playsInline className="h-full w-full object-cover" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                          )
                        )}
                        {section.mediaType === "VIDEO" && (
                          <div className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
                            🎬
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                            <span
                              className="rounded-full px-2 py-1 text-[10px] font-bold"
                              style={{ background: COLOR.gold, color: COLOR.black }}
                            >
                              ✓ Banner
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg py-3.5 text-sm font-semibold transition-transform hover:scale-[1.01] disabled:opacity-50"
            style={{ background: COLOR.gold, color: COLOR.black }}
          >
            {loading ? "Please wait..." : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}