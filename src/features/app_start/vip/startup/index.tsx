import useStartup from './useStartup';
import AccountChooser from '@features/app_start/shared/account_chooser';
import CongregationCreate from '../congregation_create';
import CongregationEncryption from '../congregation_encryption';
import EmailLinkAuthentication from '../email_link_authentication';
import EmailSent from '../email_sent';
import TermsUse from '../terms_use';
import UserAccountCreated from '../user_account_created';
import VerifyMFA from '../verify_mfa';
import WaitingLoader from '@components/waiting_loader';

const VipStartup = () => {
  const {
    isUserSignIn,
    isUserMfaVerify,
    isEmailLinkAuth,
    isEncryptionCodeOpen,
    isUserAccountCreated,
    isCongCreate,
    isLoading,
    isEmailSent,
  } = useStartup();

  return (
    <>
      <TermsUse />
      {!isCongCreate && !isEncryptionCodeOpen && !isEmailSent && isLoading && (
        <WaitingLoader type="lottie" variant="standard" />
      )}

      {!isLoading && (
        <>
          {isUserSignIn && <AccountChooser />}

          {!isUserSignIn && (
            <>
              {isUserMfaVerify && <VerifyMFA />}
              {isUserAccountCreated && <UserAccountCreated />}
              {isCongCreate && <CongregationCreate />}
              {isEmailLinkAuth && !isUserAccountCreated && (
                <EmailLinkAuthentication />
              )}
              {!isCongCreate && isEncryptionCodeOpen && (
                <CongregationEncryption />
              )}
              {isEmailSent && <EmailSent />}
            </>
          )}
        </>
      )}
    </>
  );
};

export default VipStartup;
