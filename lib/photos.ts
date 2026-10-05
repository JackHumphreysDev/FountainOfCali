export type Photo = { id: string; date: string; blob: Blob }

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fountain-of-cali-photos', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('photos', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', mode)
    const request = run(tx.objectStore('photos'))
    if (mode === 'readonly') request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => { if (mode !== 'readonly') resolve(request.result); db.close() }
    tx.onerror = () => reject(tx.error)
  })
}

export const listPhotos = () => transact<Photo[]>('readonly', store => store.getAll())
export const savePhoto = (photo: Photo) => transact<IDBValidKey>('readwrite', store => store.put(photo))
export const deletePhoto = (id: string) => transact<undefined>('readwrite', store => store.delete(id))

export async function preparePhoto(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20_000_000) throw new Error('Choose a JPEG, PNG or WebP under 20 MB.')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not prepare photo.')), 'image/jpeg', .82))
}
