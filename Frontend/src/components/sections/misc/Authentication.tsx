import LoginModal from '@/components/ui/forms/LoginModal';
import RegisterModal from '@/components/ui/forms/RegisterModal';
import RecoverModal from '@/components/ui/forms/RecoverModal';
import LoginBtn from '@/components/ui/buttons/LoginBtn';

export default function Authentication() {
  return (
    <>
      <LoginBtn />
      <LoginModal />
      <RegisterModal />
      <RecoverModal />
    </>
  );
}
