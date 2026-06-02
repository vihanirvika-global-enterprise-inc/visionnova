export default function PrescriptionUploadPage() {
  return (
    <main>
      <form>
        <label htmlFor="prescription">Upload Prescription</label>
        <input id="prescription" type="file" name="prescription" accept=".pdf,.jpg,.jpeg,.png" />
        <button type="submit">Upload Prescription</button>
      </form>
    </main>
  )
}
