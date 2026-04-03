import axios, { AxiosError } from "axios";
import { getOAuthAccessToken } from "./auth";
import dotenv from "dotenv";

dotenv.config();

const WORKDAY_API_BASE = process.env.WORKDAY_API_BASE!;

async function workdayGet(path: string): Promise<unknown> {
  const token = await getOAuthAccessToken();
  try {
    const response = await axios.get(`${WORKDAY_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (err) {
    const error = err as AxiosError;
    const status = error.response?.status;
    const data = error.response?.data;
    throw new Error(
      `Workday API error [${status}]: ${JSON.stringify(data) || error.message}`
    );
  }
}

// ─── Worker APIs ──────────────────────────────────────────────────────────────

export async function getWorkers(limit = 10, offset = 0): Promise<unknown> {
  return workdayGet(`/workers?limit=${limit}&offset=${offset}`);
}

export async function getWorkerById(workerId: string): Promise<unknown> {
  return workdayGet(`/workers/${workerId}`);
}

export async function searchWorkers(query: string, limit = 10): Promise<unknown> {
  return workdayGet(
    `/workers?search=${encodeURIComponent(query)}&limit=${limit}`
  );
}

export async function getWorkerProfile(workerId: string): Promise<unknown> {
  return workdayGet(`/workers/${workerId}/publicProfile`);
}

// ─── Organization APIs ────────────────────────────────────────────────────────

export async function getOrganizations(limit = 20): Promise<unknown> {
  return workdayGet(`/organizations?limit=${limit}`);
}

// ─── Job Profile APIs ─────────────────────────────────────────────────────────

export async function getJobProfiles(limit = 20): Promise<unknown> {
  return workdayGet(`/jobProfiles?limit=${limit}`);
}
