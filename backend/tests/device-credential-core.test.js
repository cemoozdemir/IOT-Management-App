const test =
  require("node:test");

const assert =
  require("node:assert/strict");

process.env.DB_NAME =
  "device_identity_test_db";
process.env.DB_USER =
  "device_identity_test_user";
process.env.DB_PASS =
  "device_identity_test_password";
process.env.DB_HOST =
  "127.0.0.1";
process.env.JWT_SECRET =
  "device-identity-test-jwt-secret";

const {
  generateDeviceCredential,
  hashDeviceCredential,
  parseDeviceCredential,
  verifyDeviceCredential,
} = require(
  "../dist/utils/deviceCredential.js"
);

const Device =
  require(
    "../dist/models/Device.js"
  ).default;

const DeviceCredential =
  require(
    "../dist/models/DeviceCredential.js"
  ).default;

test(
  "device credentials use high-entropy one-time raw secrets with hash-only persistence fields",
  () => {
    const first =
      generateDeviceCredential();

    const second =
      generateDeviceCredential();

    assert.match(
      first.rawCredential,
      /^iot_dev_[a-f0-9]{24}\.[A-Za-z0-9_-]{43}$/
    );

    assert.match(
      first.lookupId,
      /^[a-f0-9]{24}$/
    );

    assert.match(
      first.secretHash,
      /^[a-f0-9]{64}$/
    );

    assert.notEqual(
      first.rawCredential,
      second.rawCredential
    );

    assert.notEqual(
      first.lookupId,
      second.lookupId
    );

    assert.equal(
      first.secretHash,
      hashDeviceCredential(
        first.rawCredential
      )
    );

    assert.deepEqual(
      parseDeviceCredential(
        first.rawCredential
      ),
      {
        lookupId:
          first.lookupId,
      }
    );

    assert.equal(
      verifyDeviceCredential(
        first.rawCredential,
        first.secretHash
      ),
      true
    );

    const parts =
      first.rawCredential.split(".");

    const tamperedSecret =
      (
        parts[1][0] === "A"
          ? "B"
          : "A"
      ) +
      parts[1].slice(1);

    const tampered =
      `${parts[0]}.${tamperedSecret}`;

    assert.equal(
      verifyDeviceCredential(
        tampered,
        first.secretHash
      ),
      false
    );

    assert.equal(
      parseDeviceCredential(
        "iot_dev_invalid"
      ),
      null
    );

    assert.equal(
      verifyDeviceCredential(
        first.rawCredential,
        "not-a-valid-hash"
      ),
      false
    );

    const attributes =
      DeviceCredential
        .getAttributes();

    assert.ok(
      attributes.deviceId
    );

    assert.ok(
      attributes.lookupId
    );

    assert.ok(
      attributes.secretHash
    );

    assert.ok(
      attributes.lastUsedAt
    );

    assert.ok(
      attributes.revokedAt
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        attributes,
        "rawCredential"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        attributes,
        "secret"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        attributes,
        "token"
      ),
      false
    );

    assert.ok(
      Device
        .getAttributes()
        .lastSeenAt
    );
  }
);
