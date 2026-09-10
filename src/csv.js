    // ------------------------------------------------------------
    // CSV EXPORT
    // ------------------------------------------------------------

    function csvEscape(value) {

        return `"${String(value).replace(/"/g, '""')}"`;
    }


    function resultsToCsv(results) {

        const rows = [];

        rows.push([
            'Type',
            'Name',
            'Flag',
            'Applies to',
            'Date (ISO)',
            'URL'
        ]);


        for (const item of results) {

            rows.push([

                item.itemType,

                item.itemName,

                item.dateKind,

                item.audience,

                item.flaggedDate.toISOString(),

                item.itemUrl
            ]);
        }


        return rows
            .map(row =>
                row
                    .map(csvEscape)
                    .join(',')
            )
            .join('\n');
    }


    function downloadCSV(results) {

        const csv = resultsToCsv(results);


        const blob = new Blob(
            [csv],
            {
                type: 'text/csv;charset=utf-8'
            }
        );


        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');

        link.href = url;

        link.download =
            `canvas-outdated-due-dates-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`;

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);
    }

