import { useEffect, useRef, useState } from 'react';
import Modal from 'react-modal';
import { getIndexedDbDatabase, readBlobsFromIndexedDb, shuffle, writeBlobsToIndexedDb } from './lib';

Modal.setAppElement('#root');

const ImageSelectionSection = ({
  title,
  description,
  name,
  setter,
  loadSavedImages,
  className,
  highlightInput,
}: {
  title: string;
  description: React.ReactNode;
  name: 'signatures' | 'initials';
  setter: React.Dispatch<React.SetStateAction<HTMLImageElement[]>>;
  loadSavedImages: boolean;
  className?: string;
  highlightInput?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const setImagesFromBlobs = async (blobs: Blob[]) => {
    const urls = blobs.map((b) => URL.createObjectURL(b));
    const imagePromises = urls.map(async (u) => {
      const img = new Image();
      img.src = u;
      await img.decode();
      return img;
    });
    const images = await Promise.all(imagePromises);
    setter(shuffle(images));
  };
  useEffect(() => {
    if (!loadSavedImages) return;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {
      const db = await getIndexedDbDatabase();
      const storedBlobs = await readBlobsFromIndexedDb(db, name);
      if (!storedBlobs.length) return;
      if (!inputRef.current) return;
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(new File([], `Will use previously saved ${name}`, { type: 'image/png' }));
      inputRef.current.files = dataTransfer.files;
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      setImagesFromBlobs(storedBlobs);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [isSaveTicked, setSaveTicked] = useState(true);
  return (
    <div className={className}>
      <label htmlFor={`${name}-input`}>
        <h2 className="mb-1 text-lg font-semibold text-slate-800">{title}</h2>
        <p className="mb-2 text-slate-800">{description}</p>
      </label>
      <div className="flex relative mb-3 items-start">
        <div className="flex h-5 items-center">
          <input
            id={`${name}-save-checkbox`}
            aria-describedby="comments-description"
            name="comments"
            type="checkbox"
            checked={isSaveTicked}
            onChange={() => setSaveTicked((s) => !s)}
            className="h-4 w-4 rounded border-gray-300 accent-violet-500"
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor={`${name}-save-checkbox`} className="font-medium text-slate-700">
            Also save them to my disk & remember for next time
          </label>
        </div>
      </div>
      <input
        ref={inputRef}
        id={`${name}-input`}
        className={`box-border w-full text-sm text-slate-600 file:mr-4 file:rounded file:border-0  file:px-4 file:py-2 file:text-sm file:font-semibold ${
          highlightInput
            ? 'file:bg-violet-500 file:text-white hover:file:bg-violet-700 file:active:bg-violet-800'
            : 'file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 file:active:bg-violet-200'
        }`}
        type="file"
        accept=".png"
        multiple
        onChange={async (e) => {
          if (e.target.files === null) return;
          const files = [...e.target.files];
          if (isSaveTicked) {
            const db = await getIndexedDbDatabase();
            await writeBlobsToIndexedDb(files, db, name);
          }
          await setImagesFromBlobs(files);
        }}
      />
    </div>
  );
};

const StarterModal = ({
  canProceed,
  isModalOpen,
  closeModal,
  setSignatures,
  setInitials,
}: {
  canProceed: boolean;
  isModalOpen: boolean;
  closeModal: () => void;
  setSignatures: React.Dispatch<React.SetStateAction<HTMLImageElement[]>>;
  setInitials: React.Dispatch<React.SetStateAction<HTMLImageElement[]>>;
}) => (
  <Modal
    isOpen={isModalOpen}
    shouldCloseOnOverlayClick={canProceed}
    shouldCloseOnEsc={canProceed}
    onRequestClose={closeModal}
    contentLabel="Welcome Modal"
    overlayClassName="fixed inset-0 bg-slate-800 bg-opacity-75 transition-opacity duration-500 opacity-0"
    className="absolute left-1/2 top-1/2 w-[90vw] -translate-x-1/2 -translate-y-1/2 transform overflow-auto rounded-lg bg-white p-8 shadow-lg outline-none lg:w-[700px]"
    closeTimeoutMS={500}
  >
    <h1 className="mb-4 text-4xl font-bold text-slate-800">Welcome! 🖋️</h1>
    <p className="text-slate-800">
      This is a simple app that allows you to &quot;sign&quot; PDFs.
      <br />
      <span title="Feel free to open the network tab and check 😉">
        Everything runs in your browser, so your data is never sent to any servers ✨.
      </span>
      <br />
      To get started, select your signatures and initials below.
    </p>
    <p className="mb-4 text-slate-600">
      -{' '}
      <a href="https://aprets.me" className="underline">
        aprets
      </a>
    </p>
    <ImageSelectionSection
      className="mb-8"
      title="Signatures"
      description={
        <>
          Please assemble a folder with (ideally multiple) transparent .png signatures.
          <br />
          Select all the available signatures below.
        </>
      }
      name="signatures"
      setter={setSignatures}
      loadSavedImages={!canProceed}
      highlightInput={!canProceed}
    />
    <ImageSelectionSection
      className="mb-4"
      title="Initials"
      description={
        <>
          You can also do the same with initials.
          <br />
          If you want to use initials, please select all available initials below.
        </>
      }
      name="initials"
      setter={setInitials}
      loadSavedImages={!canProceed}
    />
    <div className="flex mt-8 justify-center">
      <button
        type="button"
        disabled={!canProceed}
        className="w-36 rounded bg-violet-500 px-4 py-2 font-bold text-white hover:bg-violet-700 active:bg-violet-800 disabled:bg-gray-300"
        onClick={closeModal}
      >
        Let&apos;s Go 🚀
      </button>
    </div>
  </Modal>
);

export default StarterModal;
