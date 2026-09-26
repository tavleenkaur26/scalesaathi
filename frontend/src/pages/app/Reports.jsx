import Container from "../../components/Container";
import PageHeader from "../../components/PageHeader";

export default function Reports() {
  return (
    <Container>
      <PageHeader
        eyebrow="Records"
        title="Reports"
        description="Approved sessions, with PDF and Word downloads and a verification QR code."
      />
    </Container>
  );
}
