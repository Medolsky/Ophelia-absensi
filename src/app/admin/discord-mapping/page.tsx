import { DataService } from "@/lib/data-service";
import { RoleMappingsManager } from "@/components/admin/role-mappings-manager";

export default async function AdminDiscordMappingPage() {
  const [mappings, institutions] = await Promise.all([
    DataService.getDiscordRoleMappings(),
    DataService.getInstitutions(),
  ]);

  return <RoleMappingsManager initialMappings={mappings} institutions={institutions} />;
}
