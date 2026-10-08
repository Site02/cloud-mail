const originalRoleName = '普通用户'
const originalRoleDescription = '只有普通使用权限'
const originalNoticeContent = '本项目仅供学习交流，禁止用于违法业务\n<br>\n请遵守当地法规，作者不承担任何法律责任'

export function displayRoleName(role, t) {
  return isBuiltInRoleName(role)
    ? t('systemDefaults.roleName')
    : role?.name || ''
}

export function displayRoleDescription(role, t) {
  return isBuiltInRoleDescription(role)
    ? t('systemDefaults.roleDescription')
    : role?.description || ''
}

export function isBuiltInRoleName(role) {
  return role?.roleId === 1 && role.name === originalRoleName
}

export function isBuiltInRoleDescription(role) {
  return role?.roleId === 1 && role.description === originalRoleDescription
}

export function displayNoticeContent(content, t) {
  return isBuiltInNoticeContent(content)
    ? t('systemDefaults.noticeContent')
    : content || ''
}

export function isBuiltInNoticeContent(content) {
  return content === originalNoticeContent
}
