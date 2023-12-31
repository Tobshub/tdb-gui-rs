import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
  type ChangeEventHandler,
  useRef,
  useState,
  type FormEventHandler,
} from "react";
import { invoke } from "@tauri-apps/api";

const reader = new FileReader();

// TODO implement schema validation
// function useSchemaValidation(_schema?: string) {
//   return {};
// }

function saveConnectionData(data: Record<FieldName, string>, connId: string) {
  const connData = { data, connId };
  localStorage.setItem(
    `tdb_conn_${data.url}:${data.db_name}`,
    JSON.stringify(connData)
  );
}

function getConnectionData(url: string, dbName: string) {
  const connData = localStorage.getItem(`tdb_conn_${url}:${dbName}`);
  if (!connData) return null;
  return JSON.parse(connData) as {
    data: Record<FieldName, string>;
    connId: string;
  };
}

enum FieldName {
  URL = "url",
  DB = "db_name",
  USERNAME = "username",
  PASSWORD = "password",
  SCHEMA = "schema",
}

export default function NewConnection() {
  const schemaInputRef = useRef<HTMLInputElement>(null);
  const schemaUploadInputRef = useRef<HTMLInputElement>(null);

  const [confirmOverwriteDialogOpen, setConfirmOverwriteDialogOpen] =
    useState(false);
  const [tempSchema, setTempSchema] = useState<string>("");
  const uploadSchema = (schema?: string) => {
    if (schemaInputRef.current)
      schemaInputRef.current.value = schema ?? tempSchema;
  };

  const handleSchemaUpload: ChangeEventHandler<HTMLInputElement> = (e) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    reader.readAsText(file);
    reader.onload = (e) => {
      if (!e.target?.result || !schemaInputRef.current) return;
      if (schemaInputRef.current.value.trim()) {
        setTempSchema(e.target.result as string);
        setConfirmOverwriteDialogOpen(true);
      } else {
        uploadSchema(e.target.result as string);
      }
      if (schemaUploadInputRef.current) schemaUploadInputRef.current.value = "";
    };
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Record<FieldName, string> = {} as unknown as Record<
      FieldName,
      string
    >;
    for (const _field in FieldName) {
      const field = FieldName[_field as keyof typeof FieldName];
      const value = formData.get(field)?.toString();
      if (!value) continue;
      data[field] = value;
    }

    const connId = crypto.randomUUID();

    const res = await invoke("connect", { connId, args: data });
    console.log(res);
    saveConnectionData(data, connId);
  };

  return (
    <main>
      <h1>New TDB Server Connection</h1>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: ".8rem",
          alignItems: "flex-start",
        }}
      >
        <h2>Network</h2>
        <fieldset>
          <TextField
            type="url"
            label="URL"
            name={FieldName.URL}
            required
            defaultValue="ws://localhost:7085"
          />
          <TextField label="Database Name" name={FieldName.DB} required />
        </fieldset>
        <h2>Authentication</h2>
        <fieldset>
          <TextField label="Username" name={FieldName.USERNAME} />
          <TextField
            type="password"
            label="Password"
            name={FieldName.PASSWORD}
          />
        </fieldset>
        <TextField
          name={FieldName.SCHEMA}
          inputRef={schemaInputRef}
          required
          multiline
          spellCheck={false}
          label="Schema"
          minRows={5}
          maxRows={15}
          sx={{ width: "min(100%, 500px)", fontSize: ".8rem" }}
        />
        <Button
          startIcon={<UploadFileIcon />}
          onClick={() => schemaUploadInputRef.current?.click()}
        >
          Import Schema
        </Button>
        <ConfirmSchemaOverwriteDialog
          open={confirmOverwriteDialogOpen}
          close={() => setConfirmOverwriteDialogOpen(false)}
          upload={uploadSchema}
        />
        <input
          type="file"
          onChange={handleSchemaUpload}
          ref={schemaUploadInputRef}
          hidden
          accept=".tdb"
        />
        <Button variant="contained" type="submit">
          CONNECT
        </Button>
      </form>
    </main>
  );
}

function ConfirmSchemaOverwriteDialog(props: {
  open: boolean;
  close: () => void;
  upload: () => void;
}) {
  return (
    <Dialog open={props.open} onClose={props.close}>
      <DialogTitle>
        Are you sure you want to overwrite existing schema?
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Import will overwrite existing schema
        </DialogContentText>
        <DialogActions>
          <Button onClick={props.close}>Cancel</Button>
          <Button
            onClick={() => {
              props.upload();
              props.close();
            }}
            autoFocus
          >
            Import Anyway
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
