import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const [, , sourceServiceAccountArg, targetServiceAccountArg, rootCollectionArg] = process.argv;

const sourceServiceAccountPath = sourceServiceAccountArg || process.env.FIREBASE_SOURCE_SERVICE_ACCOUNT;
const targetServiceAccountPath = targetServiceAccountArg || process.env.FIREBASE_TARGET_SERVICE_ACCOUNT;
const rootCollection = rootCollectionArg || process.env.FIRESTORE_ROOT_COLLECTION || 'warkopDB';

if (!sourceServiceAccountPath || !targetServiceAccountPath) {
  console.error('Usage: node scripts/migrate-firestore.mjs <source-service-account.json> <target-service-account.json> [rootCollection]');
  console.error('Or set FIREBASE_SOURCE_SERVICE_ACCOUNT and FIREBASE_TARGET_SERVICE_ACCOUNT.');
  process.exit(1);
}

const readServiceAccount = (filePath) => {
  const resolvedPath = path.resolve(filePath);
  return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
};

const ensureApp = (name, serviceAccount) => {
  const existing = getApps().find((app) => app.name === name);
  if (existing) {
    return existing;
  }

  return initializeApp(
    {
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    },
    name
  );
};

const sourceServiceAccount = readServiceAccount(sourceServiceAccountPath);
const targetServiceAccount = readServiceAccount(targetServiceAccountPath);

const sourceApp = ensureApp('source-firestore-migration', sourceServiceAccount);
const targetApp = ensureApp('target-firestore-migration', targetServiceAccount);

const sourceDb = getFirestore(sourceApp);
const targetDb = getFirestore(targetApp);

const copyDocumentTree = async (sourceRef, targetRef) => {
  const sourceSnapshot = await sourceRef.get();
  if (!sourceSnapshot.exists) {
    return 0;
  }

  await targetRef.set(sourceSnapshot.data(), { merge: false });
  let copiedCount = 1;

  const subcollections = await sourceRef.listCollections();
  for (const subcollection of subcollections) {
    const targetSubcollection = targetRef.collection(subcollection.id);
    const childDocuments = await subcollection.listDocuments();
    for (const childDocument of childDocuments) {
      copiedCount += await copyDocumentTree(childDocument, targetSubcollection.doc(childDocument.id));
    }
  }

  return copiedCount;
};

const migrateCollection = async (collectionId) => {
  const sourceCollection = sourceDb.collection(collectionId);
  const targetCollection = targetDb.collection(collectionId);
  const sourceDocuments = await sourceCollection.listDocuments();

  if (sourceDocuments.length === 0) {
    console.log(`No documents found in source collection "${collectionId}".`);
    return;
  }

  let copiedDocuments = 0;
  for (const documentRef of sourceDocuments) {
    copiedDocuments += await copyDocumentTree(documentRef, targetCollection.doc(documentRef.id));
    console.log(`Copied document tree: ${documentRef.path}`);
  }

  console.log(`Migration finished. Copied ${copiedDocuments} document(s) from "${collectionId}".`);
};

await migrateCollection(rootCollection);
