import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const checkAdminStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const db = admin.firestore();
  
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return { isAdmin: false };
    }
    
    const userData = userDoc.data();
    return {
      isAdmin: userData?.isAdmin || false,
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Failed to check admin status', error);
  }
});

export const setAdminStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerId = context.auth.uid;
  const { targetUserId, isAdmin } = data;
  
  if (typeof targetUserId !== 'string' || typeof isAdmin !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid arguments');
  }

  const db = admin.firestore();
  
  try {
    const callerDoc = await db.collection('users').doc(callerId).get();
    
    if (!callerDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Caller not found');
    }
    
    const callerData = callerDoc.data();
    const callerIsAdmin = callerData?.isAdmin || false;
    
    if (!callerIsAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can manage other admins');
    }
    
    await db.collection('users').doc(targetUserId).update({
      isAdmin,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    await db.collection('admin_activity').add({
      action: isAdmin ? 'grant_admin' : 'revoke_admin',
      callerId,
      targetUserId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { success: true };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to set admin status', error);
  }
});
