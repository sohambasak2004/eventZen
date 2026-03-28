import { useEffect, useState } from "react";
import PasswordField from "../components/PasswordField";
import AppLayout from "../components/layout/AppLayout";
import { useAuth } from "../context/AuthContext";

const splitFullName = (fullName) => {
  const normalized = fullName.trim().replace(/\s+/g, " ");
  const [firstName = "", ...lastNameParts] = normalized.split(" ");
  const lastName = lastNameParts.join(" ") || firstName;

  return {
    firstName,
    lastName,
  };
};

function UserProfile() {
  const { user, updateProfile, changePassword } = useAuth();
  const [profileImage, setProfileImage] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      fullName: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    }));
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaveError("");
    setSaveSuccess("");
    if (
      name === "currentPassword" ||
      name === "newPassword" ||
      name === "confirmPassword"
    ) {
      setPasswordError("");
      setPasswordSuccess("");
    }
    setHasChanges(true);
  };

  const resetProfileForm = (currentUser) => {
    setFormData((prev) => ({
      ...prev,
      fullName: currentUser?.name || "",
      email: currentUser?.email || "",
      phone: currentUser?.phone || "",
    }));
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    const normalizedFullName = formData.fullName.trim().replace(/\s+/g, " ");
    const normalizedEmail = formData.email.trim().toLowerCase();

    if (!normalizedFullName) {
      setSaveError("Full name is required.");
      return;
    }

    if (!normalizedEmail) {
      setSaveError("Email address is required.");
      return;
    }

    const { firstName, lastName } = splitFullName(normalizedFullName);

    try {
      setIsSaving(true);
      setSaveError("");
      setSaveSuccess("");

      const updatedUser = await updateProfile({
        firstName,
        lastName,
        email: normalizedEmail,
        phone: formData.phone.trim(),
      });

      resetProfileForm(updatedUser);
      setSaveSuccess("Profile updated successfully.");
      setHasChanges(false);
    } catch (error) {
      setSaveError(error.message || "Unable to update profile right now.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    resetProfileForm(user);
    setFormData((prev) => ({
      ...prev,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }));
    setProfileImage(null);
    setSaveError("");
    setSaveSuccess("");
    setHasChanges(false);
  };

  const handleChangePassword = async () => {
    if (
      !formData.currentPassword ||
      !formData.newPassword ||
      !formData.confirmPassword
    ) {
      setPasswordError("Please fill in all password fields.");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      setIsChangingPassword(true);
      setPasswordError("");
      setPasswordSuccess("");

      const response = await changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setPasswordSuccess(response.message || "Password changed successfully.");
      setShowPasswordModal(false);
      setHasChanges(false);
      alert(
        "Password changed successfully. Please use the new password the next time you log in.",
      );
    } catch (error) {
      setPasswordError(error.message || "Unable to change password right now.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <AppLayout>
      <section className="panel-head">
        <div>
          <h2>Settings</h2>
          <p className="text-muted">Manage your account details and password</p>
        </div>
      </section>

      <div className="settings-content">
        <form onSubmit={handleSaveChanges}>
          <div className="settings-section">
            <div className="profile-picture-section">
              <div className="profile-picture-wrapper">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="profile-picture"
                  />
                ) : (
                  <div className="profile-picture-placeholder">
                    <span>
                      {formData.fullName?.charAt(0) ||
                        user?.email?.charAt(0) ||
                        "U"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="profile-identity">
              <h3>{formData.fullName || user?.email}</h3>
              <p className="profile-role">
                {user?.roles?.includes("admin")
                  ? "Administrator"
                  : "Event Coordinator"}{" "}
              </p>
            </div>
          </div>

          <div className="settings-section">
            <h4 className="settings-section-title">Personal Information</h4>
            {saveError ? (
              <div className="settings-alert settings-alert-error">
                {saveError}
              </div>
            ) : null}
            {saveSuccess ? (
              <div className="settings-alert settings-alert-success">
                {saveSuccess}
              </div>
            ) : null}
            <div className="settings-form-grid">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="Enter your full name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="your.email@example.com"
                />
                <small className="form-text">Your updated email will be used for future sign-ins</small>
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="+91"
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h4 className="settings-section-title">Security & Password</h4>
            <div className="password-info">
              <div>
                <p className="mb-1">
                  <strong>Update Password</strong>
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => setShowPasswordModal(true)}
              >
                Change Password
              </button>
            </div>
          </div>

          <div className="settings-actions">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleDiscardChanges}
              disabled={!hasChanges || isSaving}
            >
              Discard Changes
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {showPasswordModal && (
        <div className="modal fade show" style={{ display: "block" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Change Password</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowPasswordModal(false)}
                  aria-label="Close"
                />
              </div>
              <div className="modal-body">
                {passwordError ? (
                  <div className="settings-alert settings-alert-error">
                    {passwordError}
                  </div>
                ) : null}
                {passwordSuccess ? (
                  <div className="settings-alert settings-alert-success">
                    {passwordSuccess}
                  </div>
                ) : null}
                <div className="form-group mb-3">
                  <label className="form-label">Current Password</label>
                  <PasswordField
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="Enter current password"
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="form-label">New Password</label>
                  <PasswordField
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="Enter new password"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <PasswordField
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={isChangingPassword}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default UserProfile;
