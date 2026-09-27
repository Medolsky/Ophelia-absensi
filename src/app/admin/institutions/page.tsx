import { DataService } from "@/lib/data-service";
import { InstitutionsManager } from "@/components/admin/institutions-manager";

export default async function AdminInstitutionsPage() {
  const institutions = await DataService.getInstitutions();

  return <InstitutionsManager initialInstitutions={institutions} />;
}
