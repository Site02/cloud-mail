import http from '@/axios/index.js';

// 公开接口，不需要登录
export function openCreateInbox(domain) {
    return http.post('/open/inbox', domain ? {domain} : null, {noMsg: true})
}

export function openRecentMails(address, before) {
    return http.get('/open/recentMails', {params: {address, ...(before ? {before} : {})}, noMsg: true, timeout: 12000})
}

export function openMailContent(emailId, address) {
    return http.get('/open/mailContent', {params: {emailId, address}, noMsg: true, timeout: 12000})
}

export function openDomains() {
    return http.get('/open/domains', {noMsg: true, timeout: 12000})
}
