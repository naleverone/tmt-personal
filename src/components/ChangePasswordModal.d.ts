import * as React from 'react';

export interface ChangePasswordModalProps {
  show: boolean;
  handleClose: () => void;
}

declare const ChangePasswordModal: React.FC<ChangePasswordModalProps>;
export default ChangePasswordModal;
