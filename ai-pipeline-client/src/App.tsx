import { useState, useEffect } from 'react';
import { postDetectionPrediction, pollDetectionPredictionResult } from './services/detectionService';
import { postDamagePrediction, pollDamagePredictionResult } from './services/damagePredictionService';
import { styled } from '@mui/material/styles';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SendIcon from '@mui/icons-material/Send';
import ImageCanvas from './components/ImageCanvas';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import LoadingText from './components/LoadingText';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

type BBox = {
  class_name: string
  confidence: number
  x1: number
  y1: number
  x2: number
  y2: number
}

type DamageResult = {
  prediction: string,
  label: string,
}

function App() {
  const [image, setImage] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [bboxes, setBboxes] = useState<BBox[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [croppedImages, setCroppedImages] = useState<string[]>([]);
  const [damageResults, setDamageResults] = useState<(string | null)[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
  const [selectedImageResults, setSelectedImageResults] = useState<(string | null)[]>([]);

  useEffect(() => {
    setDamageResults([]);
    if (!imageUrl || bboxes.length === 0) {
      setCroppedImages([]);
      return;
    }

    const img = new window.Image();
    img.src = imageUrl;
    img.onload = () => {
      const newCrops: string[] = [];
      bboxes.forEach((bbox) => {
        const canvas = document.createElement('canvas');
        const width = bbox.x2 - bbox.x1;
        const height = bbox.y2 - bbox.y1;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            img,
            bbox.x1, bbox.y1, width, height, // source rect
            0, 0, width, height              // destination rect
          );
          newCrops.push(canvas.toDataURL());
        }
      });
      setCroppedImages(newCrops);
    };
  }, [imageUrl, bboxes]);

  useEffect(() => {
    if (croppedImages.length === 0) return;
    setDamageResults(Array(croppedImages.length).fill(null));

    croppedImages.forEach(async (dataUrl, idx) => {
      const file = dataURLtoFile(dataUrl, `crop_${idx}.png`);
      try {
        const { prediction_id } = await postDamagePrediction(file);
        const result: DamageResult = await pollDamagePredictionResult(prediction_id);
        setDamageResults(prev => {
          const updated = [...prev];
          updated[idx] = `${result.label} (${result.prediction})`;
          return updated;
        });
      } catch (e) {
        setDamageResults(prev => {
          const updated = [...prev];
          updated[idx] = 'Error';
          return updated;
        });
      }
    });
  }, [croppedImages]);

  useEffect(() => {
    if (selectedImages.length === 0) return;

    selectedImages.forEach(async (file, idx) => {
      try {
        const { prediction_id } = await postDamagePrediction(file);
        const result: DamageResult = await pollDamagePredictionResult(prediction_id);
        setSelectedImageResults(prev => {
          const updated = [...prev];
            updated[idx] = `${result.label} (${parseFloat(result.prediction).toFixed(3)})`;
          return updated;
        });
      } catch (e) {
        setSelectedImageResults(prev => {
          const updated = [...prev];
          updated[idx] = 'Error';
          return updated;
        });
      }
    });
  }, [selectedImages]);

  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || '';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };
  
  // Cuando el usuario selecciona una imagen
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      setImageUrl(URL.createObjectURL(file))
      setBboxes([]) // Limpiar bboxes previas
    }
  }

  // Enviar imagen al backend
  const handleSubmit = async () => {
    if (!image) return
    setLoading(true)
    setError(null)

    try {
      const { prediction_id } = await postDetectionPrediction(image)
      const result = await pollDetectionPredictionResult(prediction_id)
      console.log('Prediction result:', result)
      setBboxes(result.bboxes)
    } catch (err: any) {
      setError('Ocurrió un error al procesar la imagen.')
    }
    setLoading(false)
  }

  const handleMultipleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setSelectedImages(files);
    setSelectedImageUrls(files.map(file => URL.createObjectURL(file)));
    setSelectedImageResults(Array(files.length).fill(null));
  };

  return (
    <Container>
      <h1>Pipeline Demo</h1>
      <Button
        component="label"
        role={undefined}
        variant="contained"
        tabIndex={-1}
        startIcon={<CloudUploadIcon />}
      >
        Select image
        <VisuallyHiddenInput
          type="file"
          onChange={handleImageChange}
          accept='image/*'
        />
      </Button>
      <br />
      <Button
        onClick={handleSubmit}
        disabled={!image || loading}
        component="label"
        role={undefined}
        variant="contained"
        startIcon={<SendIcon />}
        style={{ marginTop: '1em', background: 'green' }}
      >
        {loading ? 'Processing...' : 'Send image'}
      </Button>
      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      <div  style={{ marginTop: 20, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
        <div>
          <ImageCanvas
            imageUrl={imageUrl}
            bboxes={bboxes}
            loading={loading}
          />
        </div>
        <div>
          <ArrowForwardIosIcon style={{ fontSize: 80, color: '#888', margin: '0 40px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {croppedImages.map((src, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <ImageCanvas
                imageUrl={src}
                bboxes={[]}
                loading={false}
              />
              <ArrowForwardIosIcon style={{ fontSize: 80, color: '#888', margin: '0 40px' }} />
              <LoadingText text={damageResults[idx]} />
            </div>          
            
          ))}
        </div>
      </div>
      <Button
        component="label"
        role={undefined}
        variant="contained"
        tabIndex={-1}
        startIcon={<CloudUploadIcon />}
        style={{ marginTop: '1em', background: 'blue' }}
      >
        Select multiple images
        <VisuallyHiddenInput
          type="file"
          onChange={handleMultipleImageChange}
          accept="image/*"
          multiple
        />
      </Button>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {selectedImageUrls.map((src, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <ImageCanvas
              imageUrl={src}
              bboxes={[]}
              loading={false}
              style={{ height: '80px' }} // Set uniform height for images
            />
            <LoadingText text={selectedImageResults[idx]} style={{ fontSize: '1em', marginLeft: 4 }} /> {/* Make result text larger */}
          </div>
        ))}
      </div>
    </Container>
  )
}

export default App