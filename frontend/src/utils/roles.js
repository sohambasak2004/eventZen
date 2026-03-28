const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/^role_/, "");

export const hasRole = (user, roleName) => {
  const targetRole = normalizeRole(roleName);

  return (user?.roles || []).some((role) => {
    const normalizedRole = normalizeRole(role);
    return (
      normalizedRole === targetRole ||
      normalizedRole.endsWith(`_${targetRole}`)
    );
  });
};
