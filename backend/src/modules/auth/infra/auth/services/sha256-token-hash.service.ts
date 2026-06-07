import { env } from "@/config/env";
import { TokenHashService } from "@/modules/auth/domain/auth/services/token-hash-service";
import crypto from "node:crypto";
import { injectable } from "tsyringe";

/**
 * HMAC-SHA-256 com pepper carregado do env (F-05).
 *
 * Por que não bcrypt?
 * - Token plain é 256 bits de entropia (`crypto.randomBytes(32)`), brute-force
 *   é inviável independentemente do hash.
 * - Bcrypt no path de reset = DoS amplifier (cada request faz cost-12 ≈ 250ms).
 * - HMAC-SHA-256 é constant-time vs input length, lookup O(1) com índice único,
 *   e o pepper protege contra rainbow tables caso o DB vaze sem o secret.
 */
@injectable()
export class Sha256TokenHashService extends TokenHashService {
    hash(plain: string): string {
        return crypto
            .createHmac("sha256", env.RESET_TOKEN_PEPPER)
            .update(plain)
            .digest("hex");
    }
}
