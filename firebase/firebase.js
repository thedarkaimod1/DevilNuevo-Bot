const admin = require('firebase-admin');
const serviceAccount = require('../config/serviceAccountKey.json');  // Ruta correcta a tu archivo serviceAccountKey.json

// Inicializamos Firebase
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://moonfn-databased-default-rtdb.firebaseio.com/' // Asegúrate de que esta URL esté correcta
});

const db = admin.database();  // Usamos la base de datos en tiempo real

// Función para añadir monedas a un usuario
async function addCoins(userId, amount) {
    const userRef = db.ref('users/' + userId);
    const snapshot = await userRef.once('value');
    const currentCoins = snapshot.val()?.coins || 0;
    await userRef.update({ coins: currentCoins + amount });
}

// Función para restar monedas a un usuario
async function removeCoins(userId, amount) {
    const userRef = db.ref('users/' + userId);
    const snapshot = await userRef.once('value');
    const currentCoins = snapshot.val()?.coins || 0;
    await userRef.update({ coins: Math.max(0, currentCoins - amount) });
}

// Función para obtener las monedas de un usuario
async function getCoins(userId) {
    const userRef = db.ref('users/' + userId);
    const snapshot = await userRef.once('value');
    return snapshot.val()?.coins || 0;
}

// Función para registrar el invitado y su invitador
async function trackInvite(inviterId, inviteeId) {
    const inviterRef = db.ref('users/' + inviterId + '/invitations/' + inviteeId);
    await inviterRef.set(true);
    // Actualizamos la fecha de la última invitación
    const inviteDate = new Date().toISOString();
    await updateLastInviteDate(inviterId, inviteDate);
}

// Función para obtener las invitaciones de un usuario
async function getInvites(userId) {
    const userRef = db.ref('users/' + userId + '/invitations');
    const snapshot = await userRef.once('value');
    return snapshot.numChildren();  // Devuelve la cantidad de invitaciones
}

// Función para obtener la fecha de la última invitación de un usuario
async function getLastInviteDate(userId) {
    const userRef = db.ref('users/' + userId);
    const snapshot = await userRef.once('value');
    return snapshot.val()?.lastInviteDate || null;
}

// Función para actualizar la fecha de la última invitación
async function updateLastInviteDate(userId, date) {
    const userRef = db.ref('users/' + userId);
    await userRef.update({ lastInviteDate: date });
}

// Función para verificar si el usuario ha invitado recientemente (para evitar trampas)
async function hasInvitedRecently(userId) {
    const lastInviteDate = await getLastInviteDate(userId);
    if (!lastInviteDate) return false;

    const now = new Date();
    const lastInvite = new Date(lastInviteDate);
    const timeDiff = now - lastInvite;

    // Si la diferencia es menor a 5 minutos, entonces podría estar haciendo trampa
    return timeDiff < 5 * 60 * 1000;  // 5 minutos en milisegundos
}

// Función para comprobar si el invitado se unió correctamente
async function verifyInvite(inviterId, inviteeId) {
    const inviterRef = db.ref('users/' + inviterId + '/invitations/' + inviteeId);
    const snapshot = await inviterRef.once('value');
    return snapshot.exists();  // Devuelve true si el invitado ya está registrado
}

// Función para obtener el canal de logs configurado en Firebase
async function getLogsChannelId() {
    const configRef = db.ref('config');
    const snapshot = await configRef.once('value');
    return snapshot.val()?.logsChannelId || null;  // Devuelve el ID del canal de logs, o null si no está configurado
}

// Función para configurar el canal de logs en Firebase
async function setLogsChannelId(channelId) {
    const configRef = db.ref('config');
    await configRef.update({ logsChannelId: channelId });
}

module.exports = { 
    addCoins, 
    removeCoins, 
    getCoins, 
    trackInvite, 
    getInvites, 
    getLastInviteDate, 
    updateLastInviteDate, 
    hasInvitedRecently,
    verifyInvite,
    getLogsChannelId,  // Agregado para obtener el ID del canal de logs
    setLogsChannelId   // Agregado para configurar el canal de logs
};
