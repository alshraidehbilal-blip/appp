import React from "react";

function Table({ columns, data }) {
  return (
    <table className="min-w-full bg-white text-black">
      <thead className="bg-green-600 text-white">
        <tr>
          {columns.map((col) => (
            <th key={col} className="p-2">{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx} className="even:bg-gray-200 odd:bg-white">
            {columns.map((col) => (
              <td key={col} className="p-2">{row[col]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default Table;
