import {
  Transaction,
} from "sequelize";
import sequelize from "../config/database";
import DeviceCredential from "../models/DeviceCredential";
import {
  generateDeviceCredential,
} from "../utils/deviceCredential";

export interface IssuedDeviceCredential {
  rawCredential: string;
  credentialId: string;
}

export const issueDeviceCredential = async (
  deviceId: string,
  transaction?: Transaction
): Promise<IssuedDeviceCredential> => {
  const generated =
    generateDeviceCredential();

  const credential =
    await DeviceCredential.create(
      {
        deviceId,
        lookupId:
          generated.lookupId,
        secretHash:
          generated.secretHash,
        lastUsedAt: null,
        revokedAt: null,
      },
      {
        transaction,
      }
    );

  return {
    rawCredential:
      generated.rawCredential,
    credentialId:
      credential.id,
  };
};

export const revokeActiveDeviceCredentials =
  async (
    deviceId: string,
    transaction?: Transaction
  ): Promise<number> => {
    const [count] =
      await DeviceCredential.update(
        {
          revokedAt:
            new Date(),
        },
        {
          where: {
            deviceId,
            revokedAt: null,
          },
          transaction,
        }
      );

    return count;
  };

export const rotateDeviceCredential =
  async (
    deviceId: string
  ): Promise<IssuedDeviceCredential> => {
    return sequelize.transaction(
      async (transaction) => {
        await revokeActiveDeviceCredentials(
          deviceId,
          transaction
        );

        return issueDeviceCredential(
          deviceId,
          transaction
        );
      }
    );
  };
