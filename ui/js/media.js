$(document).ready(function () {
    const url = 'http://localhost:3000/';

    const table = $('#mediaTable').DataTable({
        columns: [
            { data: 'id' },
            { data: 'title' },
            { data: 'filename' },
            { data: 'created_at' },
            { data: null, orderable: false, searchable: false }
        ]
    });

    function load(type) {
        $.ajax({
            url: `${url}api/v1/media?type=${type}`,
            method: 'GET',
            dataType: 'json',
            success: function (data) {
                table.clear();
                table.rows.add(data.rows.map(r => ({...r, created_at: new Date(r.created_at).toLocaleString()})));
                table.draw();
            },
            error: function (err) { console.error(err); }
        });
    }

    // detect page type
    const path = window.location.pathname.toLowerCase();
    const isMp3 = path.endsWith('mp3.html');
    const type = isMp3 ? 'mp3' : 'mp4';
    load(type);

    $('#uploadForm').on('submit', function (e) {
        e.preventDefault();
        const files = $('#files')[0].files;
        if (!files || files.length === 0) return alert('Select files');

        // Validation rules
        const allowedExts = ['.mp3', '.mp4'];
        const maxFiles = 10;
        const maxSizeBytes = 20 * 1024 * 1024; // 20 MB per file

        if (files.length > maxFiles) {
            return alert(`You can upload up to ${maxFiles} files at once.`);
        }

        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const name = f.name || '';
            const ext = (name.lastIndexOf('.') !== -1) ? name.slice(name.lastIndexOf('.')).toLowerCase() : '';
            if (!allowedExts.includes(ext)) {
                return alert(`Unsupported file type: ${name}. Allowed: ${allowedExts.join(', ')}`);
            }
            if (f.size > maxSizeBytes) {
                return alert(`${name} is too large. Max size is ${maxSizeBytes / (1024 * 1024)} MB.`);
            }
            // Basic MIME check
            if (!f.type || (!f.type.startsWith('audio') && !f.type.startsWith('video'))) {
                // allow by extension but warn
                const proceed = confirm(`${name} has an unexpected MIME type (${f.type}). Proceed?`);
                if (!proceed) return;
            }
        }

        const form = new FormData();
        for (let i = 0; i < files.length; i++) form.append('files', files[i]);
        $.ajax({
            url: `${url}api/v1/media`,
            method: 'POST',
            data: form,
            processData: false,
            contentType: false,
            success: function () { load(type); alert('Uploaded'); },
            error: function (err) { console.error(err); alert('Upload failed'); }
        });
    });
});
