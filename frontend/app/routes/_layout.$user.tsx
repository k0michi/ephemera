import Timeline from "components/timeline";
import { useParams } from "react-router";

export default function User() {
  const params = useParams();
  const { user } = params;

  return (
    <Timeline author={user} />
  );
}