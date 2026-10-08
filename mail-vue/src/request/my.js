import http from '@/axios/index.js';

export function loginUserInfo() {
    return http.get('/my/loginUserInfo')
}

export function resetPassword(password) {
    return http.put('/my/resetPassword', {password})
}

export function userDelete(expectedSyncDelete) {
    return http.delete('/my/delete', {params: {expectedSyncDelete}, noMsg: true})
}
