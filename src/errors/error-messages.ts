export const ErrorMessages = {
  common: {
    entityNotFound: (name = 'entity') => {
      return {
        message: `${name} not found.`,
        serverStatus: 404,
      };
    },
    emailAlredyExists: {
      message: 'EMAIL_ALREDY_EXISTS',
      serverStatus: 4000,
    },
    invalidPhoneNumber: {
      message: 'INVALID_PHONE_NUMBER',
      serverStatus: 4002,
    },
    mobileAlreadyExists: {
      message: 'MOBILE_ALREDY_EXISTS',
      serverStatus: 4003,
    },
    notAllowed: {
      message: 'NOT_ALLOWED',
      serverStatus: 4003,
    },
    tooManyReqeusts: {
      message: 'TO_MANY_REQUESTS',
      serverStatus: 4004,
    },
  },
  auth: {
    invalidCredentials: {
      message: 'INVALID_CREDENTIALS',
      serverStatus: 4101,
    },
    invalidToken: {
      message: 'INVALID_TOKEN',
      serverStatus: 4102,
    },
    unauthorized: {
      message: 'UNAUTHORIZED',
      serverStatus: 4103,
    },
    merchantAlreadyRegistered: {
      message: 'MERCHANT_ALREADY_REGISTERED',
      serverStatus: 4104,
    },
    invalidOtpCode: {
      message: 'INVALID_OTP_CODE',
      serverStatus: 4105,
    },
    merchantAlreadyRegisteredWithGroup: {
      message: 'Merchant already associated with different group.',
      serverStatus: 4109,
    },
    merchantCreationFailed: {
      message: 'Error in creating merchant user',
      serverStatus: 4110,
    },
  },
  merchant: {
    notFound: {
      message: 'MERCHANT_NOT_FOUND',
      serverStatus: 4301,
    },
    missingRequiredFields: {
      message: 'Some required fields are missing.',
      serverStatus: 4302,
    },
    merchantAdminIsNotActivated: {
      message: 'Merchant admin not activated.',
      serverStatus: 4303,
    },
    merchantShouldBelongToAtLeastOneCategory: {
      message: 'Merchant must belong to at least one category.',
      serverStatus: 4304,
    },
    merchantCategoryIsNotValid: {
      message: 'Invalid category.',
      serverStatus: 4305,
    },
    merchantMaxOfferValueIsNotValid: {
      message: 'Payment plan should be POST_PAY.',
      serverStatus: 4306,
    },
    cloStatusShouldBeActive: {
      message: 'To make the circle live, the CLO status must be active.',
      serverStatus: 4307,
    },
    negativeMaxOffer: {
      message: 'Max offer percentage cannot be negative',
      serverStatus: 4308,
    },
    merchantPhoto: {
      notFound: {
        message: 'Merchant  photo not found.',
        serverStatus: 4901,
      },
    },
    merchantCreation: {
      failed: {
        message: 'Merchant creation failed',
        serverStatus: 4902,
      },
    },
    noActiveOffer: {
      message: 'Merchant does not have any active offers.',
      serverStatus: 4903,
    },
  },
  outletProfileMapping: {
    outletProfileMappingAlreadyExist: {
      message: 'Outlet profile mapping already exists.',
      serverStatus: 4401,
    },
    outletProfileMappingCreationFailed: {
      message: 'Outlet profile mapping creation failed.',
      serverStatus: 4402,
    },
    outletProfileMappingUpdateFailed: {
      message: 'Outlet profile mapping update failed.',
      serverStatus: 4403,
    },
    outletProfileMappingDeletionFailed: {
      message: 'Outlet profile mapping deletion failed.',
      serverStatus: 4404,
    },
    outletProfileMappingFetchFailed: {
      message: 'Outlet profile mapping fetch failed.',
      serverStatus: 4405,
    },
    outlet: {
      notFound: {
        message: 'Outlet is not found',
        serverStatus: 4406,
      },
    },
  },
  profileMapping: {
    profileAlreadyExist: {
      message: 'Profile already exists.',
      serverStatus: 4501,
    },
    profileCreationFailed: {
      message: 'Profile creation failed.',
      serverStatus: 4502,
    },
    profileUpdateFailed: {
      message: 'Profile update failed.',
      serverStatus: 4503,
    },
    profileDeletionFailed: {
      message: 'Profile deletion failed.',
      serverStatus: 4504,
    },
  },
  merchantConfiguration: {
    notFound: {
      message: 'Merchant Configuration not found.',
      serverStatus: 4601,
    },
  },
  group: {
    groupDeletion: {
      message: 'Invalid Group ID.',
      serverStatus: 4701,
    },
    groupInsertion: {
      message: 'Failed to create group.',
      serverStatus: 4702,
    },
    groupUpdation: {
      message: 'Failed to update group.',
      serverStatus: 4703,
    },
    groupDeletionFailedMerchantActive: {
      message: 'Group cannot be deleted while a merchant is active.',
      serverStatus: 4704,
    },
  },
  merchantProfile: {
    notFound: {
      message: 'Merchant profile metadata not found.',
      serverStatus: 4801,
    },
    merchantProfileShouldBelongToAtLeastOneCategory: {
      message: 'Merchant Profile must belong to at least one category.',
      serverStatus: 4802,
    },
    cloStatusShouldBeActive: {
      message: 'The CLO status must be active.',
      serverStatus: 4803,
    },
  },
  merchantProfilePhoto: {
    notFound: {
      message: 'Merchant profile photo not found.',
      serverStatus: 4901,
    },
  },
};
