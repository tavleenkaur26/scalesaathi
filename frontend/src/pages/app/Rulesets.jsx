import Container from "../../components/Container";
import PageHeader from "../../components/PageHeader";

export default function Rulesets() {
  return (
    <Container>
      <PageHeader
        eyebrow="Admin"
        title="Rulesets"
        description="Versioned R 76 rule tables. Uploading a new version shows which past verdicts would change."
      />
    </Container>
  );
}
