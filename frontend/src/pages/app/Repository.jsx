import Container from "../../components/Container";
import PageHeader from "../../components/PageHeader";

export default function Repository() {
  return (
    <Container>
      <PageHeader
        eyebrow="Records"
        title="Repository"
        description="Search every report by instrument, manufacturer, model, date, status, or verdict."
      />
    </Container>
  );
}
