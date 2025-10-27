import React, { useState } from "react";
import algosdk from "algosdk";
import { Web3Storage } from "web3.storage";
import { PeraWalletConnect } from "@perawallet/connect";

// === Configuration ===
const peraWallet = new PeraWalletConnect();
const WEB3_TOKEN = "YOUR_WEB3_STORAGE_API_KEY"; // 🔑 Get from https://web3.storage
const GPT_API_KEY = "YOUR_OPENAI_API_KEY"; // 🔑 Get from https://platform.openai.com/
const ALGOD_SERVER = "https://testnet-api.algonode.cloud";
const client = new algosdk.Algodv2("", ALGOD_SERVER, "");

// === Main Component ===
export default function App() {
  const [accountAddress, setAccountAddress] = useState(null);
  const [connected, setConnected] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeCid, setResumeCid] = useState("");
  const [jobs, setJobs] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [badges, setBadges] = useState([]);
  const [form, setForm] = useState({
    name: "",
    title: "",
    jobTitle: "",
    description: "",
    bounty: 0,
    stake: 0,
  });

  // === Wallet Connection ===
  const connectWallet = async () => {
    try {
      const newAccounts = await peraWallet.connect();
      peraWallet.connector?.on("disconnect", disconnectWallet);
      setAccountAddress(newAccounts[0]);
      setConnected(true);
      alert("✅ Wallet connected: " + newAccounts[0]);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert("Wallet connection failed!");
    }
  };

  const disconnectWallet = () => {
    peraWallet.disconnect();
    setAccountAddress(null);
    setConnected(false);
  };

  // === Resume Encrypt & Upload ===
  const encryptAndUpload = async () => {
    if (!resumeFile || !form.name || !form.title) {
      alert("Please fill in all fields and select a file!");
      return;
    }

    const web3Storage = new Web3Storage({ token: WEB3_TOKEN });
    const reader = new FileReader();

    reader.onload = async (e) => {
      const data = new TextEncoder().encode(e.target.result);
      const key = await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt"]
      );
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
      const blob = new Blob([iv, new Uint8Array(encrypted)], { type: "application/octet-stream" });

      const cid = await web3Storage.put([new File([blob], `${form.name}_resume.enc`)]);
      setResumeCid(cid);
      alert(`✅ Resume uploaded successfully! CID: ${cid}`);
    };

    reader.readAsText(resumeFile);
  };

  // === Job Posting ===
  const postJob = () => {
    if (!form.jobTitle || !form.description) {
      alert("Please enter job title and description!");
      return;
    }

    const newJob = {
      title: form.jobTitle,
      description: form.description,
      bounty: form.bounty,
      stake: form.stake,
      recruiter: accountAddress || "Anonymous",
    };

    setJobs([...jobs, newJob]);
    setForm({ ...form, jobTitle: "", description: "", bounty: 0, stake: 0 });

    // === Badge System ===
    if (jobs.length + 1 === 5) addBadge("⭐ New Recruiter (5 Jobs Posted)");
    if (jobs.length + 1 === 10) addBadge("🏆 Pro Recruiter (10 Jobs Posted)");
  };

  const addBadge = (badgeTitle) => {
    setBadges((prev) => [...prev, { title: badgeTitle, date: new Date().toLocaleDateString() }]);
  };

  // === AI Matching ===
  const getAIMatches = async () => {
    if (!resumeCid || jobs.length === 0) {
      alert("Upload a resume and post some jobs first!");
      return;
    }

    const resumeUrl = `https://ipfs.io/ipfs/${resumeCid}`;
    const jobText = jobs.map((job, i) => `${i + 1}. ${job.title} - ${job.description}`).join("\n");

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GPT_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5",
          messages: [
            {
              role: "system",
              content:
                "You are an AI recruiter. Match resumes to jobs based on skills, title, and experience relevance.",
            },
            {
              role: "user",
              content: `Resume: ${resumeUrl}\n\nJob Listings:\n${jobText}\n\nProvide the top 3 best matches.`,
            },
          ],
        }),
      });

      const data = await response.json();
      setAiSuggestions(data.choices?.[0]?.message?.content?.split("\n") || []);
    } catch (error) {
      console.error("Error fetching AI matches:", error);
      alert("AI matching failed. Check your API key or internet.");
    }
  };

  return (
    <div
  style={{
    fontFamily: "Poppins, sans-serif",
    backgroundColor: "#0d1117",
    color: "#f0f6fc",
    minHeight: "100vh",
    padding: "2rem",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  }}
>

      <h1
  style={{
    color: "#58a6ff",
    textAlign: "center",
    fontSize: "2.5rem",
    width: "100%",
  }}
>

        💼 Algorand Job Marketplace
      </h1>

      {/* Wallet Section */}
      <div style={{ textAlign: "center", margin: "1.5rem 0" }}>
        {!connected ? (
          <button
            onClick={connectWallet}
            style={{
              background: "#00dc82",
              color: "black",
              border: "none",
              padding: "10px 18px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Connect Pera Wallet
          </button>
        ) : (
          <div>
            <p>
              ✅ Connected Wallet:{" "}
              <span style={{ color: "#00dc82" }}>{accountAddress}</span>
            </p>
            <button
              onClick={disconnectWallet}
              style={{
                background: "#ff6b81",
                color: "white",
                border: "none",
                padding: "8px 14px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Resume Upload */}
      <div
  style={{
    background: "#161b22",
    padding: "1.5rem",
    borderRadius: "12px",
    marginBottom: "2rem",
    width: "80%",
    maxWidth: "1200px",
  }}
>

        <h2>📄 Encrypt & Upload Resume</h2>
        <input
          type="text"
          placeholder="Your Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #30363d",
            background: "#0d1117",
            color: "white",
            marginBottom: "10px",
          }}
        />
        <input
          type="text"
          placeholder="Resume Title (e.g. Software Engineer)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #30363d",
            background: "#0d1117",
            color: "white",
            marginBottom: "10px",
          }}
        />
        <input
          type="file"
          onChange={(e) => setResumeFile(e.target.files[0])}
          style={{ color: "white", marginBottom: "10px" }}
        />
        <button
          onClick={encryptAndUpload}
          style={{
            background: "#00aaff",
            border: "none",
            color: "white",
            padding: "10px 16px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Encrypt & Upload
        </button>
        {resumeCid && (
          <p style={{ marginTop: "10px", color: "#00dc82" }}>
            ✅ Uploaded:{" "}
            <a
              href={`https://ipfs.io/ipfs/${resumeCid}`}
              style={{ color: "#58a6ff" }}
              target="_blank"
              rel="noreferrer"
            >
              View Resume
            </a>
          </p>
        )}
      </div>

      {/* Job Posting */}
      <div
  style={{
    background: "#161b22",
    padding: "1.5rem",
    borderRadius: "12px",
    marginBottom: "2rem",
    width: "80%",
    maxWidth: "1200px",
  }}
>

        <h2>📢 Post a Job</h2>
        <input
          type="text"
          placeholder="Job Title"
          value={form.jobTitle}
          onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #30363d",
            background: "#0d1117",
            color: "white",
            marginBottom: "10px",
          }}
        />
        <textarea
          placeholder="Job Description..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          style={{
            width: "100%",
            height: "80px",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #30363d",
            background: "#0d1117",
            color: "white",
            marginBottom: "10px",
          }}
        />
        <div style={{ display: "flex", gap: "1rem", marginBottom: "10px" }}>
          <input
            type="number"
            placeholder="Bounty (ALGOs)"
            value={form.bounty}
            onChange={(e) => setForm({ ...form, bounty: e.target.value })}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid #30363d",
              background: "#0d1117",
              color: "white",
            }}
          />
          <input
            type="number"
            placeholder="Stake (ALGOs)"
            value={form.stake}
            onChange={(e) => setForm({ ...form, stake: e.target.value })}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid #30363d",
              background: "#0d1117",
              color: "white",
            }}
          />
        </div>
        <button
          onClick={postJob}
          style={{
            background: "#ff6b81",
            border: "none",
            color: "white",
            padding: "10px 16px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Post Job
        </button>
      </div>

      {/* Job Listings */}
      <div
  style={{
    background: "#161b22",
    padding: "1.5rem",
    borderRadius: "12px",
    marginBottom: "2rem",
    width: "80%",
    maxWidth: "1200px",
  }}
>

        <h2>🧠 Job Listings</h2>
        {jobs.length === 0 ? (
          <p>No jobs yet.</p>
        ) : (
          jobs.map((job, i) => (
            <div
              key={i}
              style={{
                background: "#0d1117",
                border: "1px solid #30363d",
                borderRadius: "10px",
                padding: "10px",
                marginTop: "10px",
              }}
            >
              <h3 style={{ color: "#58a6ff" }}>{job.title}</h3>
              <p>{job.description}</p>
              <p>
                💰 {job.bounty} ALGOs | 🔒 Stake: {job.stake}
              </p>
              <small style={{ color: "#8b949e" }}>
                Posted by: {job.recruiter}
              </small>
            </div>
          ))
        )}
      </div>

      {/* AI Job Matching */}
      <div
  style={{
    background: "#161b22",
    padding: "1.5rem",
    borderRadius: "12px",
    marginBottom: "2rem",
    width: "80%",
    maxWidth: "1200px",
  }}
>

        <h2>🤖 AI Job Matching (GPT-5)</h2>
        <button
          onClick={getAIMatches}
          style={{
            background: "#00aaff",
            border: "none",
            color: "white",
            padding: "10px 18px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Find Best Matches
        </button>
        <ul style={{ marginTop: "10px" }}>
          {aiSuggestions.map((s, i) => (
            <li key={i}>🔹 {s}</li>
          ))}
        </ul>
      </div>

      {/* Badges */}
      <div
  style={{
    background: "#161b22",
    padding: "1.5rem",
    borderRadius: "12px",
    marginBottom: "2rem",
    width: "80%",
    maxWidth: "1200px",
  }}
>

        <h2>🏅 Your Badges</h2>
        {badges.length === 0 ? (
          <p>No badges earned yet.</p>
        ) : (
          badges.map((b, i) => (
            <p key={i} style={{ color: "#00dc82" }}>
              {b.title} —{" "}
              <span style={{ color: "#8b949e" }}>{b.date}</span>
            </p>
          ))
        )}
      </div>
    </div>
  );
}