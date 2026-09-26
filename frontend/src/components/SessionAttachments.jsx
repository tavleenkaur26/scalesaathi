import { useEffect, useRef, useState } from "react";
import { api } from "../api/apiClient";
import "./SessionAttachments.css";

const acceptedTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
const formatSize = (bytes) => {
  if (bytes == null || !Number.isFinite(Number(bytes))) return "Size unavailable";
  const value = Number(bytes);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};
const formatDate = (value) => value ? `Uploaded ${new Date(value).toLocaleString()}` : "Uploaded";
const fileType = (type = "", filename = "") => {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (type === "application/pdf" || ext === "pdf") return "PDF";
  if (type === "image/png" || ext === "png") return "PNG image";
  if (type === "image/jpeg" || ["jpg", "jpeg"].includes(ext)) return "JPG image";
  return type || "File";
};

function uploadError(error) {
  if (!error?.status) return "Unable to upload this file. Check your connection and try again.";
  if (error.status === 413) return error.message || "This file exceeds the server upload limit. Choose a smaller file.";
  if (error.status === 415) return "This file type is not supported. Choose a JPG, PNG, or PDF.";
  if (error.status === 403) return "You don’t have permission to add files to this session.";
  if (error.status === 409) return "This session no longer accepts attachments.";
  if (error.status >= 500) return "The service could not save this file. Please try again.";
  return error.message || "Unable to upload this file. Please check the file and try again.";
}

function deleteError(error) {
  if (!error?.status) return "Unable to remove this attachment. Check your connection and try again.";
  if (error.status === 403) return "You don’t have permission to remove this attachment.";
  if (error.status === 409) return "This session no longer allows attachment changes.";
  if (error.status >= 500) return "The service could not remove this file. Please try again.";
  return error.message || "Unable to remove this attachment.";
}

export default function SessionAttachments({
  sessionId,
  attachments = [],
  editable = false,
  loading = false,
  onRefresh,
  title = "Attachments",
  description = "Add supporting evidence for this test session.",
  className = "",
}) {
  const inputRef = useRef(null);
  const [kind, setKind] = useState("photo");
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [localAttachments, setLocalAttachments] = useState(attachments || []);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [notice, setNotice] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [previewId, setPreviewId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewType, setPreviewType] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => { setLocalAttachments(attachments || []); }, [attachments]);

  function setUploadStatus(key, patch) {
    setUploads((current) => current.map((entry) => entry.key === key ? { ...entry, ...patch } : entry));
  }

  async function refreshSavedList() {
    if (!onRefresh) return;
    try { await onRefresh(); }
    catch { setNotice("The attachment was saved, but its details could not be refreshed yet."); }
  }

  async function addFiles(fileList, selectedKind = kind) {
    const files = Array.from(fileList || []);
    if (!files.length || !editable || uploadingCount > 0) return;
    setNotice("");
    const jobs = files.map((file, index) => {
      const key = `${Date.now()}-${index}-${file.name}`;
      const entry = { key, file, status: "uploading", error: "", kind: selectedKind };
      setUploads((current) => [...current, entry]);
      return { key, file, kind: selectedKind };
    });
    setUploadingCount((count) => count + jobs.length);
    if (inputRef.current) inputRef.current.value = "";

    for (const job of jobs) {
      if (!acceptedTypes.has(job.file.type)) {
        setUploadStatus(job.key, { status: "failed", error: "This file type is not supported. Choose a JPG, PNG, or PDF." });
        setUploadingCount((count) => Math.max(0, count - 1));
        continue;
      }
      try {
        const saved = await api.uploadAttachment(sessionId, job.file, job.kind);
        setLocalAttachments((current) => current.some((item) => item.id === saved.id) ? current : [...current, saved]);
        setUploadStatus(job.key, { status: "uploaded", attachment: saved, error: "" });
        setNotice(`${saved.filename || job.file.name} uploaded.`);
        await refreshSavedList();
        setUploads((current) => current.filter((entry) => entry.key !== job.key));
      } catch (error) {
        setUploadStatus(job.key, { status: "failed", error: uploadError(error) });
      } finally {
        setUploadingCount((count) => Math.max(0, count - 1));
      }
    }
  }

  async function removeAttachment(attachment) {
    setDeletingId(attachment.id); setDeleteMessage("");
    try {
      await api.deleteAttachment(attachment.id);
      setLocalAttachments((current) => current.filter((item) => item.id !== attachment.id));
      setDeleteId(null);
      setNotice(`${attachment.filename || "Attachment"} removed.`);
      if (previewId === attachment.id) closePreview();
      await refreshSavedList();
    } catch (error) {
      setDeleteMessage(deleteError(error));
    } finally { setDeletingId(null); }
  }

  async function togglePreview(attachment) {
    setPreviewError("");
    if (previewId === attachment.id) { closePreview(); return; }
    setPreviewLoading(true);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(""); setPreviewId(attachment.id);
    try {
      const blob = await api.getAttachment(attachment.id);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url); setPreviewType(attachment.content_type || blob.type);
    } catch (error) {
      setPreviewError(error?.status === 403 ? "You don’t have permission to view this file." : error?.status === 404 ? "This attachment is no longer available." : "Unable to open this attachment. Check your connection and try again.");
      setPreviewId(null);
    } finally { setPreviewLoading(false); }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(""); setPreviewId(null); setPreviewType(""); setPreviewError("");
  }

  function downloadPreview(attachment) {
    if (!previewUrl || previewId !== attachment.id) return;
    const link = document.createElement("a");
    link.href = previewUrl; link.download = attachment.filename || `attachment-${attachment.id}`;
    document.body.appendChild(link); link.click(); link.remove();
  }

  const savedAttachments = localAttachments || [];

  return <section className={`session-attachments ${className}`} aria-labelledby="session-attachments-title">
    <div className="session-attachments__heading"><div><p className="instrument-eyebrow">Session evidence</p><h2 id="session-attachments-title">{title}</h2><p>{description}</p></div><span>{savedAttachments.length} file{savedAttachments.length === 1 ? "" : "s"}</span></div>

    {editable && <>
      <div className="session-attachments__upload-controls">
        <label className="session-attachments__kind">Evidence type<select value={kind} onChange={(event) => setKind(event.target.value)} disabled={uploadingCount > 0}><option value="photo">Instrument photo</option><option value="document">Document / certificate</option><option value="lab_sheet">Lab sheet</option></select></label>
        <input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf" multiple onChange={(event) => addFiles(event.target.files)} aria-label="Choose evidence files" />
        <div className={`session-attachments__drop ${dragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); if (editable) setDragging(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}>
          <span className="session-attachments__upload-mark" aria-hidden="true">↑</span><span>Drop files here or <button type="button" onClick={() => inputRef.current?.click()} disabled={uploadingCount > 0}>Browse</button></span>
          <small>Supported evidence: instrument photos, calibration certificates, test documents and other supporting files.</small>
        </div>
      </div>
      {notice && <p className="session-attachments__notice" role="status">{notice}</p>}
    </>}

    {loading && <div className="session-attachments__state" role="status"><span className="instrument-spinner"/>Loading attachments…</div>}
    {!loading && savedAttachments.length === 0 && uploads.length === 0 && <div className="session-attachments__empty"><strong>No attachments added</strong><p>Supporting evidence can be attached during the test session.</p>{!editable && <small>Attachments are read-only in this workflow.</small>}</div>}

    {!!uploads.length && <ul className="session-attachments__list" aria-label="Files being uploaded">
      {uploads.map((entry) => <li className={`session-attachment session-attachment--${entry.status}`} key={entry.key}>
        <span className="session-attachment__icon" aria-hidden="true">{entry.file.type === "application/pdf" ? "PDF" : "IMG"}</span><span className="session-attachment__main"><strong>{entry.file.name}</strong><small>{fileType(entry.file.type, entry.file.name)} · {formatSize(entry.file.size)}</small>{entry.error && <small className="session-attachment__error" role="alert">{entry.error}</small>}</span>
        <span className="session-attachment__status">{entry.status === "uploading" ? <><span className="instrument-spinner"/> Uploading…</> : "Upload failed"}</span>
        {entry.status === "failed" && <button className="session-attachments__retry" type="button" onClick={() => { setUploads((current) => current.filter((item) => item.key !== entry.key)); addFiles([entry.file], entry.kind); }}>Retry</button>}
        {entry.status === "failed" && <button className="session-attachments__dismiss" type="button" onClick={() => setUploads((current) => current.filter((item) => item.key !== entry.key))} aria-label={`Dismiss ${entry.file.name} upload error`}>×</button>}
      </li>)}
    </ul>}

    {!!savedAttachments.length && <ul className="session-attachments__list" aria-label="Uploaded attachments">
      {savedAttachments.map((attachment) => <li className="session-attachment" key={attachment.id}>
        <span className="session-attachment__icon" aria-hidden="true">{attachment.content_type === "application/pdf" ? "PDF" : "IMG"}</span><span className="session-attachment__main"><strong>{attachment.filename || "Attachment"}</strong><small>{fileType(attachment.content_type, attachment.filename)} · {formatSize(attachment.size_bytes)}{attachment.kind ? ` · ${attachment.kind.replaceAll("_", " ")}` : ""}</small><small className="session-attachment__uploaded">{formatDate(attachment.uploaded_at)}</small></span><span className="session-attachment__status">Uploaded</span>
        <div className="session-attachment__actions">
          <button className="session-attachments__action" type="button" onClick={() => togglePreview(attachment)} disabled={previewLoading && previewId === attachment.id}>{previewId === attachment.id ? "Close preview" : "Preview"}</button>
          {previewId === attachment.id && previewUrl && <button className="session-attachments__action" type="button" onClick={() => downloadPreview(attachment)}>Download</button>}
          {editable && <button className="session-attachments__remove" type="button" onClick={() => { setDeleteMessage(""); setDeleteId(attachment.id === deleteId ? null : attachment.id); }} disabled={deletingId === attachment.id}>Remove</button>}
        </div>
        {previewId === attachment.id && previewLoading && <p className="session-attachment__preview-state" role="status"><span className="instrument-spinner"/>Loading preview…</p>}
        {previewId === attachment.id && previewError && <p className="session-attachment__error" role="alert">{previewError}</p>}
        {previewId === attachment.id && previewUrl && previewType.startsWith("image/") && <img className="session-attachment__preview" src={previewUrl} alt={`Preview of ${attachment.filename}`} />}
        {previewId === attachment.id && previewUrl && previewType === "application/pdf" && <iframe className="session-attachment__pdf" src={previewUrl} title={`Preview of ${attachment.filename}`} />}
        {deleteId === attachment.id && <div className="session-attachment__confirm"><span>Remove this attachment?</span><button type="button" onClick={() => removeAttachment(attachment)} disabled={deletingId === attachment.id}>{deletingId === attachment.id ? "Removing…" : "Confirm"}</button><button type="button" onClick={() => setDeleteId(null)} disabled={deletingId === attachment.id}>Cancel</button>{deleteMessage && <p className="session-attachment__error" role="alert">{deleteMessage}</p>}</div>}
      </li>)}
    </ul>}
    {notice && !editable && <p className="session-attachments__notice" role="status">{notice}</p>}
  </section>;
}
