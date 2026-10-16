// Seed once so administrator edits and removals survive future deployments.
export const resources = [
  [
    "Virginia Medicaid's Managed Care Program",
    "https://dmas.virginia.gov/for-providers/cardinal-care-providers/"
  ],
  [
    "Provider Secure Web Portal | Aetna",
    "https://www.aetnabetterhealth.com/virginia/providers/index.html"
  ],
  [
    "Atrezzo/Acentra Provider Portal",
    "https://www.dmas.virginia.gov/for-providers/service-authorization/"
  ],
  [
    "PCA Team | Anthem",
    null
  ],
  [
    "Direct VA",
    null
  ],
  [
    "Anthem Providers",
    "https://providers.anthem.com/virginia-provider/home"
  ],
  [
    "Direct My Care",
    "https://www.directmycare.com/"
  ],
  [
    "Office Ally",
    "https://cms.officeally.com/"
  ],
  [
    "PPL First",
    "https://pplfirst.com/login/"
  ],
  [
    "Sentara Health Plans Provider",
    "https://www.sentara.com/en/health-plans/providers"
  ]
];
export async function ensureHomeResources(pool, log=console.info) {
  const connection=await pool.getConnection();let locked=false;
  try {
    const [locks]=await connection.query("SELECT GET_LOCK(CONCAT(LEFT(DATABASE(),40), ':home-resources'),60) AS acquired");
    locked=Number(locks[0]?.acquired)===1;
    if(!locked)throw new Error('Could not acquire Home resources migration lock.');
    await connection.query('CREATE TABLE IF NOT EXISTS AppMigration (migrationKey VARCHAR(100) PRIMARY KEY, appliedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
    await connection.beginTransaction();
    const key='home-resources-v1';
    const [applied]=await connection.query('SELECT migrationKey FROM AppMigration WHERE migrationKey = ?', [key]);
    if(applied.length){await connection.commit();return;}
    for (const [name, url] of resources) {
      const [existing] = await connection.query('SELECT resourceId FROM resource WHERE LOWER(TRIM(name)) = LOWER(?)', [name]);
      if (!existing.length) await connection.query('INSERT INTO resource (name, Url) VALUES (?, ?)', [name, url]);
    }
    await connection.query('INSERT INTO AppMigration (migrationKey) VALUES (?)',[key]);
    await connection.commit();log('Home resources migration: resource directory initialized.');
  } catch(error){await connection.rollback();throw error;}
  finally {try{if(locked)await connection.query("SELECT RELEASE_LOCK(CONCAT(LEFT(DATABASE(),40), ':home-resources'))");}finally{connection.release();}}
}
