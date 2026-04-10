import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';

export interface DisputeStorage {
  get(key: string): Promise<{ text(): Promise<string> } | null>;
  put(key: string, body: string | ArrayBuffer, options?: { httpMetadata?: { contentType: string } }): Promise<void>;
}

export interface GetDisputeInput {
  disputeId: string;
  disputeKey: string;
}

export interface GetDisputeResult {
  success: boolean;
  dispute?: unknown;
  error?: string;
}

export async function getDisputeLogic(
  input: GetDisputeInput,
  storage: DisputeStorage
): Promise<GetDisputeResult> {
  try {
    const object = await storage.get(input.disputeKey);
    if (!object) {
      return {
        success: false,
        error: 'Dispute not found',
      };
    }

    const body = await object.text();
    const dispute = JSON.parse(body);

    return {
      success: true,
      dispute,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

export interface CreateDisputeInput {
  disputeId: string;
  disputeKey: string;
  userId: string;
  disputeData: Record<string, unknown>;
}

export interface CreateDisputeResult {
  success: boolean;
  disputeId: string;
  dispute?: Record<string, unknown>;
  error?: string;
}

export async function createDisputeLogic(
  input: CreateDisputeInput,
  storage: DisputeStorage
): Promise<CreateDisputeResult> {
  try {
    const disputeData = {
      ...input.disputeData,
      dispute_id: input.disputeId,
      created_at: input.disputeData.created_at || new Date().toISOString(),
      status: 'pending' as const,
      user_id: input.userId,
    };

    await storage.put(input.disputeKey, JSON.stringify(disputeData), {
      httpMetadata: {
        contentType: HttpContentType.ApplicationJson,
      },
    });

    return {
      success: true,
      disputeId: input.disputeId,
      dispute: disputeData,
    };
  } catch (error) {
    return {
      success: false,
      disputeId: input.disputeId,
      error: String(error),
    };
  }
}

export interface UpdateDisputeInput {
  disputeId: string;
  disputeKey: string;
  disputeData: Record<string, unknown>;
}

export interface UpdateDisputeResult {
  success: boolean;
  disputeId: string;
  error?: string;
}

export async function updateDisputeLogic(
  input: UpdateDisputeInput,
  storage: DisputeStorage
): Promise<UpdateDisputeResult> {
  try {
    const disputeObject = await storage.get(input.disputeKey);
    if (!disputeObject) {
      return {
        success: false,
        disputeId: input.disputeId,
        error: 'Dispute not found',
      };
    }

    let disputeData = JSON.parse(await disputeObject.text()) as Record<string, unknown>;

    disputeData = {
      ...disputeData,
      ...input.disputeData,
      dispute_id: input.disputeId,
    };

    if (!disputeData.created_at) {
      disputeData.created_at = new Date().toISOString();
    }

    await storage.put(input.disputeKey, JSON.stringify(disputeData), {
      httpMetadata: {
        contentType: HttpContentType.ApplicationJson,
      },
    });

    return {
      success: true,
      disputeId: input.disputeId,
    };
  } catch (error) {
    return {
      success: false,
      disputeId: input.disputeId,
      error: String(error),
    };
  }
}

export interface EvidenceFile {
  name: string;
  data: ArrayBuffer;
  type: string;
  size: number;
}

export interface UploadEvidenceInput {
  disputeId: string;
  disputeKey: string;
  evidenceKey: string;
  file: EvidenceFile;
  hash: string;
}

export interface UploadEvidenceResult {
  success: boolean;
  evidenceKey: string;
  file: {
    name: string;
    key: string;
    size: number;
    hash: string;
    type: string;
  };
  error?: string;
}

export async function uploadEvidenceFileLogic(
  input: UploadEvidenceInput,
  storage: DisputeStorage
): Promise<UploadEvidenceResult> {
  try {
    await storage.put(input.evidenceKey, input.file.data, {
      httpMetadata: {
        contentType: input.file.type,
      },
    });

    return {
      success: true,
      evidenceKey: input.evidenceKey,
      file: {
        name: input.file.name,
        key: input.evidenceKey,
        size: input.file.size,
        hash: input.hash,
        type: input.file.type,
      },
    };
  } catch (error) {
    return {
      success: false,
      evidenceKey: input.evidenceKey,
      file: {
        name: input.file.name,
        key: input.evidenceKey,
        size: input.file.size,
        hash: input.hash,
        type: input.file.type,
      },
      error: String(error),
    };
  }
}

export interface UpdateDisputeWithEvidenceInput {
  disputeId: string;
  disputeKey: string;
  matchId?: string | null;
  reason?: string | null;
  description?: string | null;
  newEvidence: Array<{
    filename: string;
    type: string;
    size_bytes: number;
    hash: string;
    url: string;
    uploaded_at: string;
  }>;
  packageHash: string;
}

export interface UpdateDisputeWithEvidenceResult {
  success: boolean;
  disputeId: string;
  evidence_package_hash: string;
  evidence_files: number;
  evidence: Array<{
    filename: string;
    type: string;
    size_bytes: number;
    hash: string;
    url: string;
    uploaded_at: string;
  }>;
  error?: string;
}

export async function updateDisputeWithEvidenceLogic(
  input: UpdateDisputeWithEvidenceInput,
  storage: DisputeStorage
): Promise<UpdateDisputeWithEvidenceResult> {
  try {
    let dispute: Record<string, unknown> = {};

    const disputeObject = await storage.get(input.disputeKey);
    if (disputeObject) {
      dispute = JSON.parse(await disputeObject.text());
    } else {
      // Create new dispute if it doesn't exist
      dispute.dispute_id = input.disputeId;
      dispute.created_at = new Date().toISOString();
    }

    if (input.matchId) dispute.match_id = input.matchId;
    if (input.reason) dispute.reason = input.reason;
    if (input.description) dispute.description = input.description;

    const existingEvidence = Array.isArray(dispute.evidence) ? dispute.evidence as unknown[] : [];
    dispute.evidence = [...existingEvidence, ...input.newEvidence];
    dispute.evidence_updated_at = new Date().toISOString();
    dispute.evidence_package_hash = input.packageHash;

    await storage.put(input.disputeKey, JSON.stringify(dispute, null, 2), {
      httpMetadata: {
        contentType: HttpContentType.ApplicationJson,
      },
    });

    return {
      success: true,
      disputeId: input.disputeId,
      evidence_package_hash: input.packageHash,
      evidence_files: input.newEvidence.length,
      evidence: input.newEvidence,
    };
  } catch (error) {
    return {
      success: false,
      disputeId: input.disputeId,
      evidence_package_hash: input.packageHash,
      evidence_files: input.newEvidence.length,
      evidence: input.newEvidence,
      error: String(error),
    };
  }
}
