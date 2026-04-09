/**
 * Clerk test accounts using the +clerk_test convention.
 * These accounts skip real email/SMS delivery.
 * Verification code is always 424242.
 * Accounts are created during E2E setup via the sign-up flow.
 */
export const TEST_ACCOUNTS = {
  landlord: {
    email: "landlord+clerk_test@liz.test",
    password: "TestLandlord123!",
    phone: "+12015550100",
    verificationCode: "424242",
    role: "landlord",
  },
  tenant: {
    email: "tenant+clerk_test@liz.test",
    password: "TestTenant123!",
    phone: "+12015550101",
    verificationCode: "424242",
    role: "tenant",
  },
};
